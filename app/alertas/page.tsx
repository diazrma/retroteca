import PushSettings from "@/components/PushSettings";

export const metadata = { title: "Alertas no celular" };

export default function Alertas() {
  return (
    <div className="wrap">
      <h1 className="page-title">🔔 Fita do dia no celular</h1>
      <p className="lead">
        Todo dia de manhã a Retroteca avisa o que chegou nas categorias que você escolheu. Sem e-mail e sem cadastro, só
        uma notificação.
      </p>
      <PushSettings />
    </div>
  );
}
