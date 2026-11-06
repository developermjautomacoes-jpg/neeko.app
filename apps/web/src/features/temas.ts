/** Temas do escritório. As cores de cada tela ficam em packages/ui/src/tokens.css. */
export const TEMAS = [
  { id: "verde", nome: "Verde Corporativo", frase: "Moderna e profissional", principal: "#22C98A", menu: "#05211B", topo: "#0A4A39", fundo: "#F1F6F4", cores: ["#22C98A", "#0E8C7A", "#05211B", "#94A3B8"] },
  { id: "azul", nome: "Azul Tech", frase: "Confiança e tecnologia", principal: "#1677E0", menu: "#0A2C63", topo: "#BFD9F9", fundo: "#F2F7FE", cores: ["#1677E0", "#0B5CC4", "#7DB9FA", "#0A2C63"] },
  { id: "roxo", nome: "Roxo Premium", frase: "Inovação e destaque", principal: "#7C3AED", menu: "#150B33", topo: "#4C1D95", fundo: "#F6F3FE", cores: ["#7C3AED", "#5B21B6", "#150B33", "#B794F6"] },
  { id: "dourado", nome: "Dourado Elegante", frase: "Sofisticação e equilíbrio", principal: "#E8A33D", menu: "#FBEBD2", topo: "#F7DDB4", fundo: "#FFFAF2", cores: ["#E8A33D", "#B97714", "#5B3410", "#FBEBD2"] },
];
export function aplicarTema(tema?: string | null) {
  if (tema && tema !== "verde") document.documentElement.dataset.tema = tema;
  else delete document.documentElement.dataset.tema;
}
