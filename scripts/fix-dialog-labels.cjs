// Проставляет aria-label модалкам с role="dialog", у которых нет названия.
// node scripts/fix-dialog-labels.cjs [--check]
const fs = require("node:fs");
const path = require("node:path");

const LABELS = {
  "ChangelogModal.tsx": "Список изменений",
  "Comments.Add.tsx": "Новый комментарий",
  "Comments.Edit.tsx": "Редактирование комментария",
  "CropModal.tsx": "Обрезка изображения",
  "FiltersAgeRatingModal.tsx": "Возрастной рейтинг",
  "FiltersGenreModal.tsx": "Жанры",
  "FiltersListExcludeModal.tsx": "Списки для исключения",
  "FiltersModal.tsx": "Фильтры",
  "FiltersTypesModal.tsx": "Типы релизов",
  "PopularModal.tsx": "Популярное",
  "ScheduleModal.tsx": "Расписание",
  "SettingsModal.tsx": "Настройки",
  "CreateCollection.tsx": "Новая коллекция",
};

const checkOnly = process.argv.includes("--check");
const root = path.join(__dirname, "..", "app", "components");
const extra = [path.join(__dirname, "..", "app", "pages")];

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith(".tsx") ? [full] : [];
  });

const files = [...walk(root), ...extra.flatMap((dir) => (fs.existsSync(dir) ? walk(dir) : []))];
const report = [];

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const name = path.basename(file);
  const label = LABELS[name];
  if (!label) continue;

  // Находим тег с role="dialog", у которого ещё нет aria-label / aria-labelledby
  const updated = source.replace(
    /(<[A-Za-z][^>]*?)\s+role="dialog"/g,
    (match, prefix) => {
      if (/aria-label|aria-labelledby/.test(prefix)) return match;
      return `${prefix} role="dialog" aria-label="${label}"`;
    }
  );

  if (updated !== source) {
    report.push({ name, changed: true });
    if (!checkOnly) fs.writeFileSync(file, updated);
  } else {
    report.push({ name, changed: /role="dialog"/.test(source) ? false : "no-dialog" });
  }
}

console.log(JSON.stringify(report, null, 1));
