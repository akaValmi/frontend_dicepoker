const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

export const rollDice = async (rerollDice: boolean[]) => {
  const response = await fetch(`${API_BASE_URL}/roll`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rerollDice }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error response from server:", errorText);
    throw new Error("Failed to roll dice");
  }
  const data = await response.json();
  return data.dice;
};

export const evaluateDice = async () => {
  const response = await fetch(`${API_BASE_URL}/evaluate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to evaluate dice");
  }
  const data = await response.json();
  return data.evaluation.name; // Devolver solo el nombre de la evaluación
};

export const nextTurn = async () => {
  const response = await fetch(`${API_BASE_URL}/next-turn`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to proceed to next turn");
  }
  const data = await response.json();
  return data;
};

export const newGame = async () => {
  const response = await fetch(`${API_BASE_URL}/new-game`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to start new game");
  }
  const data = await response.json();
  return data;
};
