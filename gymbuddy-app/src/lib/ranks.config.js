// src/lib/ranks.config.js
import starterIcon from "$lib/assets/ranks/starter.svg";
import rookieIcon from "$lib/assets/ranks/rookie.svg";
import grinderIcon from "$lib/assets/ranks/grinder.svg";
import regularIcon from "$lib/assets/ranks/regular.svg";
import builderIcon from "$lib/assets/ranks/builder.svg";
import athleteIcon from "$lib/assets/ranks/athlete.svg";
import warriorIcon from "$lib/assets/ranks/warrior.svg";
import championIcon from "$lib/assets/ranks/champion.svg";
import eliteIcon from "$lib/assets/ranks/elite.svg";
import titanIcon from "$lib/assets/ranks/titan.svg";
import mythicIcon from "$lib/assets/ranks/mythic.svg";
import legendIcon from "$lib/assets/ranks/legend.svg";
import masterIcon from "$lib/assets/ranks/master.svg";
import grandmasterIcon from "$lib/assets/ranks/grandmaster.svg";
import immortalIcon from "$lib/assets/ranks/immortal.svg";
import ascendantIcon from "$lib/assets/ranks/ascendant.svg";
import paragonIcon from "$lib/assets/ranks/paragon.svg";
import apexIcon from "$lib/assets/ranks/apex.svg";
import apexStarIcon from "$lib/assets/ranks/apex_star.svg";

export const RANKS = [
  { key: "starter", name: "Starter", xp: 0 },
  { key: "rookie", name: "Rookie", xp: 500 },
  { key: "grinder", name: "Grinder", xp: 1200 },
  { key: "regular", name: "Regular", xp: 2200 },
  { key: "builder", name: "Builder", xp: 3500 },
  { key: "athlete", name: "Athlete", xp: 5200 },
  { key: "warrior", name: "Warrior", xp: 7400 },
  { key: "champion", name: "Champion", xp: 10200 },
  { key: "elite", name: "Elite", xp: 13800 },
  { key: "titan", name: "Titan", xp: 18200 },
  { key: "mythic", name: "Mythic", xp: 23800 },
  { key: "legend", name: "Legend", xp: 30800 },
  { key: "master", name: "Master", xp: 39600 },
  { key: "grandmaster", name: "Grandmaster", xp: 50600 },
  { key: "immortal", name: "Immortal", xp: 64200 },
  { key: "ascendant", name: "Ascendant", xp: 80800 },
  { key: "paragon", name: "Paragon", xp: 101000 },
  { key: "apex", name: "Apex", xp: 126000 }
];

export const RANK_ICONS = {
  starter: starterIcon,
  rookie: rookieIcon,
  grinder: grinderIcon,
  regular: regularIcon,
  builder: builderIcon,
  athlete: athleteIcon,
  warrior: warriorIcon,
  champion: championIcon,
  elite: eliteIcon,
  titan: titanIcon,
  mythic: mythicIcon,
  legend: legendIcon,
  master: masterIcon,
  grandmaster: grandmasterIcon,
  immortal: immortalIcon,
  ascendant: ascendantIcon,
  paragon: paragonIcon,
  apex: apexIcon,
  apex_star: apexStarIcon
};

export function getRankIcon(key) {
  return RANK_ICONS[key] || apexIcon;
}
