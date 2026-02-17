"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { io, Socket } from "socket.io-client";
import Dice from "../components/Dice";
import RollButton from "../components/RollButton";
import Result from "../components/Result";

type Evaluation = { name: string; value: number } | null;

type PlayerState = {
  id: string;
  name: string;
  dice: number[];
  keep: boolean[];
  rolls: number;
  evaluation: Evaluation;
};

type RoomState = {
  id: string;
  players: PlayerState[];
  currentPlayer: number;
  winner: string | null;
  roundWinner: string | null;
  matchWinner: string | null;
  round: number;
  scores: number[];
  objective: {
    id: string;
    name: string;
    target: string;
    bonus: number;
    description: string;
  } | null;
  lastActions: { id: number; message: string }[];
  lastActionId: number;
};

type AnnouncementItem = {
  id: number;
  message: string;
  type: "roll" | "turn";
  dice?: number[] | null;
};

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000";

const emptyDice = [1, 1, 1, 1, 1];

export default function Home() {
  const socketRef = useRef<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomInput, setRoomInput] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [entryMode, setEntryMode] = useState<"create" | "join">("create");
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [announcementDice, setAnnouncementDice] = useState<number[] | null>(
    null
  );
  const [showAnnouncement, setShowAnnouncement] = useState<boolean>(false);
  const [announcementQueue, setAnnouncementQueue] = useState<AnnouncementItem[]>(
    []
  );
  const lastActionIdRef = useRef<number>(0);
  const [showRollAnimation, setShowRollAnimation] = useState<boolean>(false);
  const isProcessingAnnouncementRef = useRef<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [showLoading, setShowLoading] = useState<boolean>(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, { autoConnect: false });
    socketRef.current = socket;

    socket.on("room_joined", ({ roomId, playerIndex, room }) => {
      setRoomId(roomId);
      setPlayerIndex(playerIndex);
      setRoomState(room);
      setErrorMessage("");
      setShowLoading(false);
      lastActionIdRef.current = room?.lastActionId ?? 0;
      setAnnouncementQueue([]);
      setAnnouncement(null);
      setShowAnnouncement(false);
      setShowRollAnimation(false);
    });

    socket.on("state_update", (room) => {
      setRoomState(room);
      if (typeof room?.lastActionId === "number") {
        if (room.lastActionId < lastActionIdRef.current) {
          lastActionIdRef.current = room.lastActionId;
          setAnnouncementQueue([]);
          setAnnouncement(null);
          setShowAnnouncement(false);
          setShowRollAnimation(false);
        }
      }
      const actions: AnnouncementItem[] = room?.lastActions ?? [];
      const newActions = actions.filter(
        (action: AnnouncementItem) => action.id > lastActionIdRef.current
      );
      if (newActions.length > 0) {
        lastActionIdRef.current = newActions[newActions.length - 1].id;
        setAnnouncementQueue((prev) => [
          ...prev,
          ...newActions.map((action): AnnouncementItem => ({
            id: action.id,
            message: action.message,
            type: action.message.startsWith("Turno de ") ? "turn" : "roll",
            dice: action.dice ?? null,
          })),
        ]);
      }
    });

    socket.on("error_message", ({ message }) => {
      setErrorMessage(message || "Ocurrió un error.");
      setShowLoading(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (isProcessingAnnouncementRef.current) return;
    if (announcementQueue.length === 0) return;

    isProcessingAnnouncementRef.current = true;
    const next = announcementQueue[0];

    if (next.type === "roll") {
      setShowRollAnimation(true);
      setTimeout(() => {
        setShowRollAnimation(false);
        setAnnouncement(next.message);
        setAnnouncementDice(next.dice ?? null);
        setShowAnnouncement(true);
        setTimeout(() => {
          setShowAnnouncement(false);
          setAnnouncementDice(null);
          setAnnouncementQueue((prev) => prev.slice(1));
          isProcessingAnnouncementRef.current = false;
        }, 2500);
      }, 1200);
    } else {
      setAnnouncement(next.message);
      setAnnouncementDice(null);
      setShowAnnouncement(true);
      setTimeout(() => {
        setShowAnnouncement(false);
        setAnnouncementQueue((prev) => prev.slice(1));
        isProcessingAnnouncementRef.current = false;
      }, 2000);
    }
  }, [announcementQueue]);

  const isConnected = socketRef.current?.connected ?? false;

  const ensureConnected = () => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setErrorMessage("Ingresa tu nombre.");
      return;
    }
    setShowLoading(true);
    ensureConnected();
    socketRef.current?.emit("create_room", { name: playerName.trim() });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomInput.trim()) {
      setErrorMessage("Ingresa nombre y código de sala.");
      return;
    }
    setShowLoading(true);
    ensureConnected();
    socketRef.current?.emit("join_room", {
      roomId: roomInput.trim().toUpperCase(),
      name: playerName.trim(),
    });
  };

  const myPlayer = useMemo(() => {
    if (!roomState || playerIndex === null) return null;
    return roomState.players[playerIndex] ?? null;
  }, [roomState, playerIndex]);

  const isMyTurn =
    roomState && playerIndex !== null && roomState.currentPlayer === playerIndex;

  const handleToggleKeep = (index: number) => {
    if (!isMyTurn || !myPlayer) return;
    const newKeep = [...myPlayer.keep];
    newKeep[index] = !newKeep[index];
    socketRef.current?.emit("set_keep", { keep: newKeep });
  };

  const handleRoll = () => {
    if (!isMyTurn || !myPlayer) return;
    const rerollDice =
      myPlayer.rolls === 0
        ? [true, true, true, true, true]
        : myPlayer.keep;
    socketRef.current?.emit("roll_dice", { rerollDice });
  };

  const handleEndTurn = () => {
    if (!isMyTurn) return;
    socketRef.current?.emit("end_turn");
  };

  const handleNewGame = () => {
    socketRef.current?.emit("new_game");
  };

  const renderPlayer = (index: number) => {
    const player = roomState?.players[index];
    const dice = player?.dice ?? emptyDice;
    const keep = player?.keep ?? [false, false, false, false, false];
    const isActivePlayer = roomState?.currentPlayer === index;
    const isCurrent = playerIndex === index;

    return (
      <div className="flex flex-col items-center">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
          {player?.name || `Jugador ${index + 1}`}
          {isCurrent ? " (Tú)" : ""}
        </h2>
        <div className="flex gap-x-1 sm:gap-x-2 flex-wrap justify-center">
          {dice.map((value, diceIndex) => (
            <Dice
              key={`${index}-${diceIndex}`}
              value={value}
              kept={keep[diceIndex]}
              onClick={() =>
                isCurrent && isMyTurn ? handleToggleKeep(diceIndex) : null
              }
              animate={isActivePlayer}
              isActivePlayer={isActivePlayer}
            />
          ))}
        </div>
        <div className="text-xs sm:text-sm text-white mt-2">
          Tiradas: {player?.rolls ?? 0}/2
        </div>
        <div className="text-xs sm:text-sm text-white mt-1">
          {player?.evaluation?.name || "Sin evaluación"}
        </div>
        {isCurrent && isMyTurn && (player?.rolls ?? 0) > 0 && (
          <div className="text-[11px] sm:text-xs text-amber-200/80 mt-2">
            Puedes terminar turno o seleccionar los dados para volver a tirar.
          </div>
        )}
      </div>
    );
  };

  const topPlayerIndex = playerIndex === 0 ? 1 : 0;
  const bottomPlayerIndex = playerIndex === 0 ? 0 : 1;

  return (
    <motion.div
      className="min-h-screen flex flex-col justify-between items-center px-3 sm:px-4 py-4 sm:py-6"
      style={{
        background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(164, 116, 60, 0.45), rgba(12, 8, 6, 0.95))`,
      }}
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      {showLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <motion.div
            className="medieval-panel rounded-2xl p-6 sm:p-8 text-center text-amber-100 max-w-lg w-full"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="text-xs uppercase tracking-[0.3em] text-amber-300 mb-2">
              Preparando partida
            </div>
            <div className="flex justify-center mb-4">
              <motion.div
                className="w-10 h-10 rounded-full border-2 border-amber-200/40 border-t-amber-300"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              />
            </div>
            <div className="text-base sm:text-lg medieval-title">
              La primera vez que crees partida puede tardar un tiempo ya que
              alojo en servidores gratuitos.
            </div>
          </motion.div>
        </div>
      )}
      {!roomId ? (
        <div className="w-full max-w-2xl mt-10 sm:mt-16 medieval-panel p-5 sm:p-8 rounded-2xl text-white">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 medieval-title">
            Póker de Dados
          </h1>
          <p className="text-xs sm:text-sm text-amber-100/80 mb-4 sm:mb-6">
            Reúne a tu rival, lanza los dados y conquista la mesa.
          </p>
          <div className="text-xs sm:text-sm text-amber-100/80 mb-6 space-y-2">
            <p>
              1) Crea una sala o únete con un código. Cada jugador tiene 2 tiradas
              por turno.
            </p>
            <p>
              2) Tras tu primera tirada, selecciona los dados que quieres volver a
              tirar y vuelve a lanzar.
            </p>
            <p>
              3) La ronda tiene un objetivo que otorga bonus. Gana la mejor
              combinación ajustada al objetivo.
            </p>
            <p>
              4) El ganador de la ronda suma 1 punto. Gana el primero en llegar a
              3 puntos.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className={`medieval-button font-bold py-2 px-4 rounded ${
                  entryMode === "create" ? "ring-2 ring-amber-200" : "opacity-80"
                }`}
                onClick={() => setEntryMode("create")}
              >
                Crear sala
              </button>
              <button
                className={`medieval-button font-bold py-2 px-4 rounded ${
                  entryMode === "join" ? "ring-2 ring-amber-200" : "opacity-80"
                }`}
                onClick={() => setEntryMode("join")}
              >
                Unirse a sala
              </button>
            </div>

            {entryMode === "create" ? (
              <div className="flex flex-col gap-3">
                <input
                  className="bg-black/30 border border-amber-300/30 rounded px-3 py-2 text-amber-50 placeholder:text-amber-200/60"
                  placeholder="Tu nombre"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                />
                <button
                  className="medieval-button font-bold py-2 px-4 rounded"
                  onClick={handleCreateRoom}
                >
                  Vamos
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  className="bg-black/30 border border-amber-300/30 rounded px-3 py-2 text-amber-50 placeholder:text-amber-200/60"
                  placeholder="Tu nombre"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                />
                <input
                  className="bg-black/30 border border-amber-300/30 rounded px-3 py-2 text-amber-50 placeholder:text-amber-200/60"
                  placeholder="Código de sala"
                  value={roomInput}
                  onChange={(event) => setRoomInput(event.target.value)}
                />
                <button
                  className="medieval-button font-bold py-2 px-4 rounded"
                  onClick={handleJoinRoom}
                >
                  Vamos
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="text-red-200 text-sm">{errorMessage}</div>
            )}
          </div>
        </div>
      ) : (
        <>
          {showRollAnimation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
              <motion.div
                className="medieval-panel rounded-2xl p-6 sm:p-8 text-center text-amber-100 max-w-md w-full"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <div className="text-xs uppercase tracking-[0.3em] text-amber-300 mb-3">
                  Rodando los dados
                </div>
                <div className="flex justify-center gap-3 mb-4">
                  {[1, 3, 5].map((value, index) => (
                    <motion.div
                      key={`roll-${value}-${index}`}
                      animate={{
                        rotate: [0, 360, 720],
                        y: [0, -10, 0],
                        scale: [1, 1.15, 1],
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: index * 0.1,
                      }}
                    >
                      <Dice
                        value={value}
                        kept={false}
                        onClick={() => null}
                        animate={true}
                        isActivePlayer={true}
                      />
                    </motion.div>
                  ))}
                </div>
                <div className="text-sm text-amber-100/80">
                  La fortuna decide...
                </div>
              </motion.div>
            </div>
          )}
          {showAnnouncement && announcement && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
              <motion.div
                className="medieval-panel rounded-2xl p-6 sm:p-8 text-center text-amber-100 max-w-md w-full"
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="text-xs uppercase tracking-[0.3em] text-amber-300 mb-2">
                  Crónica de la ronda
                </div>
                <div className="text-xl sm:text-2xl medieval-title">
                  {announcement}
                </div>
                {announcementDice && (
                  <div className="flex justify-center gap-2 mt-4 flex-wrap">
                    {announcementDice.map((value, index) => (
                      <Dice
                        key={`result-${value}-${index}`}
                        value={value}
                        kept={false}
                        onClick={() => null}
                        animate={false}
                        isActivePlayer={false}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          )}
          <div className="w-full max-w-5xl flex flex-col items-center mt-3 sm:mt-4 text-white medieval-panel p-4 sm:p-6 rounded-2xl">
            <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] text-amber-200">
              Sala
            </div>
            <div className="text-2xl sm:text-3xl font-bold medieval-title">
              {roomId}
            </div>
            <div className="text-xs sm:text-sm mt-2 text-amber-100/80">
              Estado conexión: {isConnected ? "Conectado" : "Desconectado"}
            </div>
            <div className="text-xs sm:text-sm mt-1 text-amber-100/80">
              Turno: {roomState?.players?.[roomState.currentPlayer]?.name || "-"}
            </div>
            <div className="text-xs sm:text-sm mt-1 text-amber-100/80">
              Ronda: {roomState?.round ?? 1}
            </div>
            <div className="text-xs sm:text-sm mt-1 text-amber-100/80">
              Objetivo: {roomState?.objective?.name || "-"} ({
                roomState?.objective?.description || ""})
            </div>
            <div className="text-xs sm:text-sm mt-1 text-amber-100/80">
              Puntos: {roomState?.players?.[0]?.name || "J1"} {roomState?.scores?.[0] ?? 0} - {roomState?.scores?.[1] ?? 0} {roomState?.players?.[1]?.name || "J2"}
            </div>
            <button
              className="medieval-button font-bold py-2 px-4 rounded mt-4"
              onClick={() => setShowInfo(true)}
            >
              Información de combinaciones
            </button>
            {roomState?.roundWinner && (
              <Result result={`Ronda para: ${roomState.roundWinner}`} />
            )}
            {roomState?.matchWinner && (
              <Result result={`Ganador final: ${roomState.matchWinner}`} />
            )}
          </div>

          <div className="w-full max-w-5xl flex flex-col gap-4 sm:gap-6 mt-4 sm:mt-6">
            <div className="medieval-card rounded-2xl p-4 sm:p-6">
              {renderPlayer(topPlayerIndex)}
            </div>
            <div className="medieval-card rounded-2xl p-4 sm:p-6">
              {renderPlayer(bottomPlayerIndex)}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 sm:gap-4 mt-5 sm:mt-6 mb-6 sm:mb-8">
            {errorMessage && (
              <div className="text-red-200 text-sm">{errorMessage}</div>
            )}
            <div className="text-xs sm:text-sm text-amber-100/80">
              {roomState?.matchWinner
                ? `Partida finalizada: ${roomState.matchWinner}`
                : isMyTurn
                ? myPlayer?.rolls === 0
                  ? "Tu turno: tira los dados para comenzar."
                  : myPlayer?.rolls && myPlayer.rolls < 2
                    ? "Puedes terminar turno o seleccionar los dados para volver a tirar."
                    : "Puedes terminar turno."
                : "Turno del rival. Espera tu momento."}
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <RollButton
                onClick={handleRoll}
                text={myPlayer?.rolls === 0 ? "Tirar Dados" : "Volver a tirar"}
                disabled={!isMyTurn || !myPlayer || myPlayer.rolls >= 2 || !!roomState?.matchWinner}
              />
              <button
                className="medieval-button font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleEndTurn}
                disabled={!isMyTurn || !!roomState?.matchWinner}
              >
                Terminar turno
              </button>
              <button
                className="medieval-button font-bold py-2 px-4 rounded"
                onClick={handleNewGame}
              >
                Nueva partida
              </button>
            </div>
          </div>
          {showInfo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
              <motion.div
                className="medieval-panel rounded-2xl p-6 sm:p-8 text-center text-amber-100 max-w-lg w-full"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <div className="text-xs uppercase tracking-[0.3em] text-amber-300 mb-2">
                  Jerarquía de combinaciones
                </div>
                <div className="text-xs sm:text-sm text-amber-200/80 uppercase tracking-[0.25em] mb-2">
                  Combinación / Ejemplo
                </div>
                <div className="text-sm sm:text-base text-amber-100/90 space-y-3 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <span>1. Cinco iguales</span>
                    <span className="text-amber-200/80">🎲 4 4 4 4 4</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>2. Cuatro iguales</span>
                    <span className="text-amber-200/80">🎲 6 6 6 6 2</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>3. Full House</span>
                    <span className="text-amber-200/80">🎲 3 3 3 5 5</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>4. Trío</span>
                    <span className="text-amber-200/80">🎲 2 2 2 5 6</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>5. Doble par</span>
                    <span className="text-amber-200/80">🎲 1 1 4 4 6</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>6. Un par</span>
                    <span className="text-amber-200/80">🎲 5 5 2 3 6</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>7. Carta alta</span>
                    <span className="text-amber-200/80">🎲 1 3 4 5 6</span>
                  </div>
                </div>
                <button
                  className="medieval-button font-bold py-2 px-4 rounded mt-6"
                  onClick={() => setShowInfo(false)}
                >
                  Cerrar
                </button>
              </motion.div>
            </div>
          )}
        </>
      )}
      <div className="mt-6 mb-2 text-xs sm:text-sm text-amber-100/70">
        <a
          href="https://github.com/akaValmi"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-amber-200"
        >
          Hecho por Kevin Miranda
        </a>
      </div>
    </motion.div>
  );
}
