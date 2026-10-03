"use client";

/** Imagem que esconde o cartão inteiro se não carregar: nada aparece sem foto. */
export default function SafeImg(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
      {...props}
      onError={(e) => {
        const card = e.currentTarget.closest<HTMLElement>(".card, .bcover") ?? e.currentTarget;
        card.style.display = "none";
      }}
    />
  );
}
