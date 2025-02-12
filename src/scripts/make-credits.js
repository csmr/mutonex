// Inject `git shortlog -n -s` into template
const cfg = {
  contribsPath: "./dist/CONTRIBS",
  templatePath: "./client/mutonex.html",
  out: "./dist/index.html",
  prefix: "<em>C o n t r i b u t i o n s:\n</em>",
}

const contStr = Deno.readTextFileSync(cfg.contribsPath).
  split("\n").
  filter(id => id.length>0). // null tail
  map((id) => {
    return ("<span>" + 
      id.replace(/\s+\d+\s+/g, "") +
      "</span>");
  });

const txt = Deno.readTextFileSync(cfg.templatePath).
  replace("<contribs/>", cfg.prefix + contStr);

Deno.writeTextFileSync(cfg.out, txt);
