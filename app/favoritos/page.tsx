import Favorites from "@/components/Favorites";

export const metadata = { title: "Meus favoritos" };

export default function Page() {
  return (
    <div className="wrap">
      <h1 className="page-title">⭐ Meus favoritos</h1>
      <p className="lead">Seu baú pessoal: tudo que você favoritou, de todas as fitas, salvo na sua conta.</p>
      <Favorites />
    </div>
  );
}
