// Inject `git shortlog -n -s` into template
const a = {
  con: "CONTRIBS",
  tem: "./client/mutonex.html",
  out: "./dist/index.html",
  pfx: "<em>C o n t r i b u t i o n s:\n</em>",
}
const log = Deno.readTextFileSync(a.con).
  split("\n").
  filter(id => id.length>0). // null tail
  map((id) => {
    return ("<span>" + 
      id.replace(/\s+\d+\s+/g, "") +
      "</span>");
  });
const txt = Deno.readTextFileSync(a.tem).
  replace("<footer>", "<footer>" + a.pfx + log);
Deno.writeTextFileSync(a.out, txt);
