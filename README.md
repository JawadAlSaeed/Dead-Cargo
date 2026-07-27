# Dead Cargo
## A Roguelike Horror Inventory Management Adventure

![Dead Cargo Game](dead_cargo_logo.svg)

## Core Concept
"Dead Cargo" is a top-down survival horror game where players control a courier trapped in a cursed cargo ship overrun by zombies. Inspired by Resident Evil's inventory system and Escape from Tarkov's loot containers, players must carefully manage limited, irregularly-shaped inventory space while scavenging supplies, fighting or fleeing the undead, and finding a way off the ship.

## Current Gameplay

### Resident Evil / Tarkov-Style Inventory
- A grid inventory where every item occupies its own irregular shape (a Tetris-style cell mask), not just a rectangle — a pistol is a small L, a shotgun a large L, first aid is 2x1, ammo and herbs are 1x1.
- Items can be dragged to any free spot in the grid and rotated in place.
- The inventory starts at 4x4 — small enough that you feel the walls of it immediately — and is expanded by lootable upgrades: a Side Pouch (+1 column) and a Backpack (+1 row, guaranteed somewhere in the Cargo Hold), up to a ceiling of 6x6. The pack is meant to stay uncomfortable; an upgrade is relief, not a solution.
- Searching a crate, cabinet, locker, or footlocker opens a dedicated loot window with its own grid, separate from your inventory — just like Tarkov. Contents are generated the first time you search a container, reveal one at a time while you search, and stay put if you leave and come back. Drag items either direction between the container and your inventory, or double-click to quick-take/quick-use.

### Crafting
- **Drag one item onto another in your inventory to combine them.** There is no crafting screen — the grid is the interface, the way it is in Resident Evil. A valid pairing highlights the target in amber as you hold an item over it; selecting an item lists what it combines with, so nothing has to be memorised.
- Two **Green Herbs** make a **Medical Kit**. Every recipe beats its inputs used separately — two herbs heal 30 each, and the kit heals 80 — but you pay for it in flexibility: a kit is one action you cannot split across two bad moments, and it is wasted if you use it at 90 health. Deciding when *not* to combine is the point.
- **Gunpowder**, **Scrap Metal** and **Wiring** are raw materials that do nothing on their own. Two Gunpowder become Shotgun Shells; Gunpowder and Scrap become 9mm Ammo; two Scrap become a Combat Knife — so a run that turns up no weapons still has a way out. They cost grid space now for a payoff later, which is the decision they exist to force.

### Traps
- Wiring turns the other two materials into things you put on the floor: **Gunpowder + Wiring** makes a **Pipe Bomb**, **Scrap Metal + Wiring** makes a **Bear Trap**. Use one from your inventory and the courier sets it down where they stand.
- A trap is the opposite trade to a gun. A gun spends ammo on a threat you can see, now; a trap spends grid space and a guess about where things will come from, ahead of time — so it pays off for knowing the ship, which is the knowledge a run accumulates anyway.
- The two are not two flavours of the same thing. The **Pipe Bomb** does heavy damage to everything in a radius, arms after a short delay so it can't be dropped at your feet as a panic button, and **it does not care whose side you are on** — its blast radius is drawn on the floor so you can see exactly where not to stand. The **Bear Trap** barely scratches anything, but pins one zombie where it stands for a few seconds and is completely safe to walk past. One removes a threat; the other buys you time.
- Traps stay where you left them for the rest of the run, including in rooms you have walked out of.
- Combining works both in the inventory window and while a container is open — including dragging an item straight out of the crate onto one in your bag, which is usually the natural move. The result always lands in your inventory, and a combination that has nowhere to go is refused outright rather than consuming the ingredients.

### Procedural Ship
- Each run generates a two-deck ship: six rooms (Crew Bedroom, Galley, Medical Bay, Cargo Hold, Engine Room, Captain's Cabin), shuffled and split three-and-three across the lower and upper deck's corridors, connected by a stairwell — so which rooms neighbor each other and which deck the start room / Captain's Cabin land on both vary run to run.
- Each corridor runs along the ship's hull: rooms open off one side, and the other side is windowed, with open water visible beyond the glass.
- Rooms are furnished as the rooms they claim to be, not scattered with interchangeable crates: bunks, wardrobes and nightstands in the crew bedroom; a stove, fridge, counters and a dining table in the galley; beds, medicine cabinets and supply shelves in the medical bay; an engine block, pipes, a workbench and toolboxes in the engine room. Beds, counters and wardrobes sit against the walls the way furniture actually does, and what is searchable follows from what the room is — so the ship reads as a place before it reads as a loot table.
- Loot is scarce on purpose. Most containers hold one item and about a quarter hold nothing at all; an empty locker is what gives a full one any weight. Weapons you are already carrying are never rolled, since a second pistol is not a reward but a grid-space problem.
- Zombie placement and the exact furniture layout are randomized per run.
- The Captain's Key is always guaranteed to spawn somewhere reachable, so the ship is always solvable — it unlocks the Captain's Cabin, which is otherwise sealed.

### Survival Horror Combat
- Three zombie types with distinct behavior: the standard Shambler, a fast low-health Runner with a wide detection range, and a slow high-health Brute that hits hard. They chase the player on sight and deal damage on contact.
- **You can only see zombies in the wedge you are facing.** The ship itself — layout, furniture, containers — is always visible, so you never get lost or have to hunt for loot in the dark. The undead are the exception: outside a 75° cone in front of the courier they vanish completely, and since aiming follows the cursor, where you look is a decision with a cost. Looking down the corridor means not looking at the door behind you. Two things keep it fair rather than merely punishing: anything close enough to touch is felt regardless of facing, and anything that hits you (or that you hit) is revealed for a moment, so no damage ever arrives from nowhere. Everything else, you hear before you see.
- Aiming is continuous — the courier always faces the cursor — and the left mouse button attacks. Firearms (pistol, shotgun) consume ammo and need reloading (pulls matching ammo from your inventory); the Combat Knife is a silent, close-range melee weapon that needs neither.
- Screen shake, a muzzle flash, a hit-reactive crosshair, and procedurally synthesized gunfire/melee/footstep/growl sound effects give combat feedback without any external audio assets.
- Because sight is restricted, hearing carries the load. A zombie hunting you growls for as long as it is hunting, panned to the side it is on and getting louder and more frequent as it closes — so an unseen thing behind you is something you can track by ear. Anything that does land a hit puts a red arc at the screen edge pointing back at it.
- Health is tracked on a HUD bar with a low-health vignette; running out ends the run.

### Escape Mechanic
- Reach the Captain's Cabin (using the Captain's Key) and interact with the radio to call for rescue and win the run.

## Planned / Not Yet Implemented
These are part of the original vision and not yet built:
- Throwables and stealth as further alternatives to gunfights
- Persistent meta-progression and unlockable starting loadouts across runs
- Multiple escape routes (lifeboat, engine repair) beyond the radio

## Controls
- **WASD** — move
- **Mouse** — aim; the courier always faces the cursor
- **Left mouse** — attack with the equipped weapon
- **F** — search containers / use the radio
- **R** — reload (firearms only)
- **Tab** — open/close inventory
- **M** — mute audio
- In any grid (inventory or a loot window): **drag** an item to move it, **R** rotates the item while you're holding it, **double-click** an item to use/equip it (or quick-take it from a container)
- In your inventory: **drag an item onto another** to combine them, if the pair has a recipe

## Technical Stack
- Vite + React + TypeScript, client-only (no server)
- React Three Fiber (Three.js) for rendering, zustand for state
- Custom procedural generation for the ship layout, rooms, and loot
- Custom AABB collision detection and a polyomino grid-placement engine for the inventory

## Getting Started
```
npm install
npm run dev
```
Then open http://localhost:5173. `npm run build` produces a static production build in `dist/`.
