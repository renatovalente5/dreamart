#!/usr/bin/env python3
"""O logótipo sem a bola verde: as peças que o site usa, tiradas do logótipo da cliente.

Lê _cliente/logo/logo-quadrado-verde.jpg (o logótipo que a Dream Art mandou, todo num quadrado verde) e
tira só o verde: as flores, o «Dream Art», o «LEMBRANÇAS | EVENTOS» e o arco ficam com os píxeis dela,
sem redesenhar nada. Na aresta, a opacidade é |C − B| / |F − B| (C a cor do píxel, B o verde, F a cor da
arte mais parecida: o creme ou o dourado), e pinta-se F, não a mistura.

Escreve em media/marca/:
  logo-rodape.png      o desenho inteiro, creme e dourado (o rodapé verde)
  logo-cabecalho.png   o desenho inteiro, com o semicírculo, a verde (o cabeçalho claro; o Renato escolheu-o
                       a 9 nov 2026: o creme passa ao verde do logótipo, e o dourado do arco e do «|» a um
                       dourado mais fundo, para se ver no creme)

    python3 scripts/logo-sem-circulo.py
"""
import os

import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEM = os.path.join(RAIZ, '_cliente', 'logo', 'logo-quadrado-verde.jpg')
MARCA = os.path.join(RAIZ, 'media', 'marca')
VERDE = (0x55, 0x60, 0x45)        # o verde do logótipo (o --verde do site)
DOURADO_FUNDO = (0xB8, 0x9A, 0x5E)  # o arco e o «|» no creme: o dourado claro do logótipo não se via


def sem_o_verde(im):
    """A arte do logótipo em RGBA, sem o verde do fundo."""
    a = np.asarray(im.convert('RGB')).astype(np.float64)
    borda = np.concatenate([a[:40].reshape(-1, 3), a[-40:].reshape(-1, 3), a[:, :40].reshape(-1, 3), a[:, -40:].reshape(-1, 3)])
    fundo = np.median(borda, axis=0)
    d = a - fundo
    dist = np.linalg.norm(d, axis=2)
    longe = dist > np.percentile(dist[dist > 60], 50)
    px = a[longe]
    lum = px.mean(axis=1)
    sat = px.max(axis=1) - px.min(axis=1)
    creme = np.median(px[(lum > 220) & (sat < 30)], axis=0)
    dourado = np.median(px[(sat > 50) & (lum > 140) & (lum < 210)], axis=0)
    cores = np.stack([creme, dourado])
    dc = cores - fundo
    cos = np.einsum('hwc,kc->hwk', d, dc) / (np.maximum(dist, 1e-6)[..., None] * np.linalg.norm(dc, axis=1)[None, None, :])
    k = np.argmax(cos, axis=2)
    alfa = np.clip((dist / np.linalg.norm(dc, axis=1)[k] - 0.06) / 0.94, 0, 1)  # o ruído do JPEG fica a zero
    rgba = np.dstack([cores[k], alfa * 255]).round().astype(np.uint8)
    return rgba, dourado


def recortar(rgba, folga=8):
    im = Image.fromarray(rgba)
    caixa = im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    caixa = (max(0, caixa[0] - folga), max(0, caixa[1] - folga), min(im.width, caixa[2] + folga), min(im.height, caixa[3] + folga))
    return im.crop(caixa)


def a_verde(im, dourado):
    """O creme passa ao verde do logótipo; o dourado ao dourado mais fundo (no creme)."""
    a = np.asarray(im).copy()
    rgb = a[..., :3].astype(int)
    e_dourado = np.abs(rgb - np.asarray(dourado)).sum(axis=2) < 60
    visivel = a[..., 3] > 0
    a[visivel & ~e_dourado, :3] = VERDE
    a[visivel & e_dourado, :3] = DOURADO_FUNDO
    return Image.fromarray(a)


def main():
    rgba, dourado = sem_o_verde(Image.open(ORIGEM))
    os.makedirs(MARCA, exist_ok=True)
    recortar(rgba).save(os.path.join(MARCA, 'logo-rodape.png'), optimize=True)
    a_verde(recortar(rgba), dourado).save(os.path.join(MARCA, 'logo-cabecalho.png'), optimize=True)
    for f in ('logo-rodape.png', 'logo-cabecalho.png'):
        im = Image.open(os.path.join(MARCA, f))
        print(f, im.size, os.path.getsize(os.path.join(MARCA, f)) // 1024, 'KB')


if __name__ == '__main__':
    main()
