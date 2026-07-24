// Full-screen states: main menu, game over, escaped.

import { useGameStore } from "../state/useGameStore";

export function MenuScreen() {
  const startGame = useGameStore((s) => s.startGame);
  return (
    <div className="screen">
      <h1 className="title">DEAD CARGO</h1>
      <p className="tagline">A courier. A cursed cargo ship. Not enough pockets.</p>
      <div className="screen-body">
        <p>
          The ship is overrun. Somewhere aboard is the <strong>Captain's Key</strong> — find it,
          reach the <strong>Captain's Cabin</strong>, and radio for rescue.
        </p>
        <ul className="controls-list">
          <li><b>WASD</b> — move</li>
          <li><b>Right mouse</b> — aim &nbsp; <b>Left mouse</b> — attack with equipped weapon (while aiming)</li>
          <li><b>F</b> — search containers &amp; use the radio</li>
          <li><b>R</b> — reload &nbsp; <b>Tab</b> — inventory &nbsp; <b>M</b> — mute</li>
          <li>In grids: <b>drag</b> to move, <b>R</b> rotates the held item</li>
        </ul>
      </div>
      <button className="btn btn-big" onClick={startGame}>
        BOARD THE SHIP
      </button>
    </div>
  );
}

export function DeadScreen() {
  const startGame = useGameStore((s) => s.startGame);
  const backToMenu = useGameStore((s) => s.backToMenu);
  return (
    <div className="screen screen-dead">
      <h1 className="title title-dead">YOU DIED</h1>
      <p className="tagline">The cargo claims another courier.</p>
      <div className="screen-buttons">
        <button className="btn btn-big" onClick={startGame}>
          TRY AGAIN
        </button>
        <button className="btn" onClick={backToMenu}>
          Main Menu
        </button>
      </div>
    </div>
  );
}

export function WonScreen() {
  const startGame = useGameStore((s) => s.startGame);
  const backToMenu = useGameStore((s) => s.backToMenu);
  return (
    <div className="screen screen-won">
      <h1 className="title title-won">RESCUE INBOUND</h1>
      <p className="tagline">The radio crackles to life. You're getting off this ship.</p>
      <div className="screen-buttons">
        <button className="btn btn-big" onClick={startGame}>
          ANOTHER RUN
        </button>
        <button className="btn" onClick={backToMenu}>
          Main Menu
        </button>
      </div>
    </div>
  );
}
