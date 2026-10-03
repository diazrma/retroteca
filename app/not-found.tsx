import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <div className="empty">
        <div className="static" />
        <p style={{ fontSize: 34, margin: "10px 0" }}>SEM SINAL 📺</p>
        <p>Essa fita não está na prateleira (ou foi apagada).</p>
        <Link className="btn hot" href="/">Voltar para a fita de hoje</Link>
      </div>
    </div>
  );
}
