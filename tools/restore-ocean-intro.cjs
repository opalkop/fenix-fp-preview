"use strict";

const fs=require("node:fs");
const file=process.argv[2];
if(!file)throw new Error("Usage: node restore-ocean-intro.cjs <fenix-sync/projects.json>");

const bundle=JSON.parse(fs.readFileSync(file,"utf8"));
const project=bundle.projects?.find(item=>item.name==="Ocean Fantasy Adventure #3");
if(!project)throw new Error("Ocean Fantasy Adventure #3 was not found.");

const restored={
  welcome:{
    title:"Welcome to the Ocean Fantasy Adventure!",
    body:[
      "Welcome, brave ocean explorer! The five magical currents that protect the underwater kingdom have disappeared, and every ocean zone needs your help.",
      "Begin among the bright corals, visit Turtle Bay, search the Sunken Treasure, explore the mysterious deep, and finally reach the Fantasy Kingdom.",
      "Along the way, you will color amazing creatures, solve mazes, match pictures, connect dots, find hidden objects, complete drawings, discover words, and crack logic puzzles.",
      "Work carefully, enjoy every challenge, and mark each finished mission on your Mission Tracker. With courage, creativity, and a sharp eye, you can restore the lost currents and bring magic back to the ocean!"
    ].join("\n\n"),
    footer:"Let the adventure begin!",alignment:"center"
  },
  mission:{
    title:"Your Mission",
    body:[
      "The five magical currents that protect the ocean have been lost. Without them, the underwater kingdom is slowly losing its light, color, and magic.",
      "Your mission is to travel through five ocean zones and complete every challenge you find.",
      "Coral Reef — begin your journey among bright corals and friendly sea creatures.",
      "Turtle Bay — explore the peaceful gardens and follow the hidden paths.",
      "Sunken Treasure — search ancient ruins and discover forgotten relics.",
      "Mystic Deep — face mysterious hazards and follow the magical current.",
      "Fantasy Kingdom — complete the final challenges and restore the ocean’s power.",
      "Finish all 50 activities to return the five lost currents and become a true Ocean Adventure Champion!"
    ].join("\n\n"),
    footer:"Your mission begins now!",alignment:"center"
  },
  "how-to-use":{
    title:"How to Use This Book",
    body:[
      "Choose any activity and read the instruction at the top of the page before you begin.",
      "Use a pencil for mazes, word searches, matching activities, dot-to-dot pages, and logic puzzles. Use crayons or colored pencils for coloring and drawing activities.",
      "Work slowly and carefully. If a challenge feels difficult, take a short break, try again, or ask an adult for help.",
      "After completing an activity, color one star on your Mission Tracker. You can complete the zones in order or return to your favorite pages whenever you like.",
      "Most importantly, enjoy the adventure and be proud of every challenge you complete!"
    ].join("\n\n"),
    footer:"Take your time, do your best, and have fun!",alignment:"left"
  },
  rules:{
    title:"Adventure Rules",
    body:[
      "1. Read every instruction before starting.",
      "2. Use a pencil when you may need to erase.",
      "3. Color and draw carefully inside the activity area.",
      "4. Take your time — the adventure is not a race.",
      "5. Ask an adult for help whenever you need it.",
      "6. Mark every completed activity on your Mission Tracker.",
      "7. Keep trying, stay curious, and enjoy each discovery!"
    ].join("\n\n"),
    footer:"Be curious. Be creative. Keep going!",alignment:"left"
  },
  skills:{
    title:"Skills You’ll Practice",
    body:[
      "Focus — stay with each activity from beginning to end.",
      "Observation — notice small details, shapes, patterns, and hidden objects.",
      "Problem-Solving — choose paths, test ideas, and discover solutions.",
      "Hand-Eye Coordination — connect dots, draw missing parts, and follow lines carefully.",
      "Creativity — use color, imagination, and your own artistic choices.",
      "Confidence — learn from every attempt and celebrate your progress.",
      "Patience — take your time and keep going when a challenge feels difficult."
    ].join("\n\n"),
    footer:"Every page helps your skills grow!",alignment:"left"
  }
};

const stamp=new Date().toISOString();
const touched=[];
for(const page of project.pages||[]){
  if(page.module!=="intro-studio")continue;
  const type=page.recipe?.settings?.pageType;
  const copy=restored[type];
  if(!copy)continue;
  page.title=copy.title;
  page.updatedAt=stamp;
  page.recipe.title=copy.title;
  page.recipe.settings={...page.recipe.settings,...copy};
  touched.push(type);
}
const expected=Object.keys(restored);
if(touched.length!==expected.length||expected.some(type=>!touched.includes(type)))throw new Error(`Expected ${expected.join(", ")}; restored ${touched.join(", ")}`);
project.updatedAt=stamp;
bundle.updatedAt=stamp;
fs.writeFileSync(file,JSON.stringify(bundle));
console.log(JSON.stringify({project:project.name,pages:project.pages.length,restored:touched,untouchedOutro:project.pages.filter(page=>["congratulations-studio","qr-studio","certificate-studio"].includes(page.module)).length},null,2));
