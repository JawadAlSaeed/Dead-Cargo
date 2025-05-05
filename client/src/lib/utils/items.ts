// Function to generate a unique ID for an item
export function generateItemId(type: string): string {
  return `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Item properties and definitions
export const WEAPON_TYPES = {
  PISTOL: {
    name: "Pistol",
    size: { width: 2, height: 1 },
    damage: 25,
    ammoType: "9mm"
  },
  SHOTGUN: {
    name: "Shotgun",
    size: { width: 3, height: 1 },
    damage: 75,
    ammoType: "shotgun"
  },
  KNIFE: {
    name: "Combat Knife",
    size: { width: 1, height: 2 },
    damage: 15,
    ammoType: null
  }
};

export const HEALING_TYPES = {
  FIRST_AID: {
    name: "First Aid",
    size: { width: 1, height: 1 },
    healAmount: 50
  },
  HERB_GREEN: {
    name: "Green Herb",
    size: { width: 1, height: 1 },
    healAmount: 30
  },
  HERB_RED: {
    name: "Red Herb",
    size: { width: 1, height: 1 },
    healAmount: 0 // Combine with green herb
  }
};

export const AMMO_TYPES = {
  PISTOL_AMMO: {
    name: "9mm Ammo",
    size: { width: 1, height: 1 },
    ammoCount: 15,
    ammoType: "9mm"
  },
  SHOTGUN_AMMO: {
    name: "Shotgun Shells",
    size: { width: 1, height: 1 },
    ammoCount: 5,
    ammoType: "shotgun"
  }
};

export const KEY_TYPES = {
  CABIN_KEY: {
    name: "Cabin Key",
    size: { width: 1, height: 1 },
    keyId: "cabin"
  },
  MASTER_KEY: {
    name: "Master Key",
    size: { width: 1, height: 1 },
    keyId: "master"
  },
  SPECIAL_KEY: {
    name: "Captain's Key",
    size: { width: 1, height: 1 },
    keyId: "captain"
  }
};

// Function to generate a random item based on type
export function generateRandomItem(type?: string) {
  // Determine item type if not specified
  if (!type) {
    const types = ["weapon", "healing", "ammo", "key"];
    const weights = [0.2, 0.4, 0.3, 0.1]; // Higher chance for healing and ammo
    
    // Weighted random selection
    let random = Math.random();
    let selectedType = "";
    
    for (let i = 0; i < types.length; i++) {
      if (random < weights[i]) {
        selectedType = types[i];
        break;
      }
      random -= weights[i];
    }
    
    type = selectedType || "healing"; // Default to healing if something goes wrong
  }
  
  // Generate item based on type
  switch (type) {
    case "weapon":
      const weaponKeys = Object.keys(WEAPON_TYPES);
      const randomWeapon = WEAPON_TYPES[weaponKeys[Math.floor(Math.random() * weaponKeys.length)]];
      return {
        name: randomWeapon.name,
        type: "weapon",
        size: randomWeapon.size,
        image: "",
        properties: {
          damage: randomWeapon.damage,
          ammoType: randomWeapon.ammoType
        }
      };
      
    case "healing":
      const healingKeys = Object.keys(HEALING_TYPES);
      const randomHealing = HEALING_TYPES[healingKeys[Math.floor(Math.random() * healingKeys.length)]];
      return {
        name: randomHealing.name,
        type: "healing",
        size: randomHealing.size,
        image: "",
        properties: {
          healAmount: randomHealing.healAmount
        }
      };
      
    case "ammo":
      const ammoKeys = Object.keys(AMMO_TYPES);
      const randomAmmo = AMMO_TYPES[ammoKeys[Math.floor(Math.random() * ammoKeys.length)]];
      return {
        name: randomAmmo.name,
        type: "ammo",
        size: randomAmmo.size,
        image: "",
        properties: {
          ammoCount: randomAmmo.ammoCount,
          ammoType: randomAmmo.ammoType
        }
      };
      
    case "key":
      const keyKeys = Object.keys(KEY_TYPES);
      const randomKey = KEY_TYPES[keyKeys[Math.floor(Math.random() * keyKeys.length)]];
      return {
        name: randomKey.name,
        type: "key",
        size: randomKey.size,
        image: "",
        properties: {
          keyId: randomKey.keyId
        }
      };
      
    default:
      // Default to a small misc item
      return {
        name: "Unknown Item",
        type: "misc",
        size: { width: 1, height: 1 },
        image: "",
        properties: {}
      };
  }
}
