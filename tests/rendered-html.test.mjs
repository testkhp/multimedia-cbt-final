import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");
const loadJson = async (relative) => JSON.parse(await read(relative));
test("renders the complete static student site", async () => {
  const html = await read("out/index.html");
  assert.match(html, /멀티미디어콘텐츠제작전문가/);
  assert.doesNotMatch(html, /codex-preview/);
});

test("contains ten complete theory units with independent term entries", async () => {
  const theory = await loadJson("app/data/theory.json");
  assert.equal(theory.units.length, 10);
  assert.equal(new Set(theory.units.map((unit) => unit.name)).size, 10);
  assert.ok(theory.units.every((unit) => unit.elements.length > 0));
  const elements = theory.units.flatMap((unit) => unit.elements);
  const topics = elements.flatMap((element) => element.topics);
  const terms = topics.flatMap((topic) => topic.terms);
  assert.equal(elements.length, 60);
  assert.equal(topics.length, 163);
  assert.equal(terms.length, 582);
  assert.equal(new Set(elements.map((element) => element.id)).size, elements.length);
  assert.equal(new Set(topics.map((topic) => topic.id)).size, topics.length);
  assert.ok(elements.every((element) => element.number && element.title && element.topics.length > 0));
  assert.ok(topics.every((topic) => topic.title && topic.elementId && topic.explanations.join(" ").length >= 250));
  assert.ok(terms.every((term) => term.term && term.definition));

  const colorSection = theory.units[0].elements[0].topics[0];
  assert.deepEqual(colorSection.terms.slice(0, 3).map((term) => term.term), ["디스플레이 캘리브레이션", "프로파일", "OSD"]);
  assert.equal(colorSection.terms[0].english, "Display Calibration");
  assert.equal(colorSection.terms[2].english, "On Screen Display");
});

test("links all 600 questions to the reorganized knowledge topics", async () => {
  const theory = await loadJson("app/data/theory.json");
  const { questions } = await loadJson("app/data/questions.json");
  const questionIds = new Set(questions.map((question) => question.id));
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const topics = theory.units.flatMap((unit) => unit.elements.flatMap((element) => element.topics));
  const linkedIds = new Set(topics.flatMap((topic) => topic.questionIds));
  assert.equal(linkedIds.size, 600);
  assert.deepEqual([...questionIds].filter((id) => !linkedIds.has(id)), []);
  assert.deepEqual([...linkedIds].filter((id) => !questionIds.has(id)), []);
  for (const unit of theory.units) {
    const unitIds = new Set(unit.elements.flatMap((element) => element.topics.flatMap((topic) => topic.questionIds)));
    assert.equal(unitIds.size, 60);
    assert.ok([...unitIds].every((id) => questionsById.get(id)?.unit === unit.name));
  }
});

test("contains the reviewed 600-question distribution", async () => {
  const { questions } = await loadJson("app/data/questions.json");
  assert.equal(questions.length, 600);
  assert.equal(new Set(questions.map((question) => question.id)).size, 600);
  const typeCounts = Object.groupBy(questions, (question) => question.type);
  assert.equal(typeCounts.multiple.length, 240);
  assert.equal(typeCounts.ox.length, 120);
  assert.equal(typeCounts.matching.length, 90);
  assert.equal(typeCounts.short.length, 150);
  assert.ok(questions.every((question) => question.difficulty === "보통"));

  const perUnit = Object.groupBy(questions, (question) => question.unit);
  assert.equal(Object.keys(perUnit).length, 10);
  assert.ok(Object.values(perUnit).every((items) => items.length === 60));
  for (const question of questions.filter((item) => item.type === "multiple")) {
    assert.equal(question.options.length, 4);
    assert.ok(question.options.includes(question.answer));
  }
  for (const question of questions.filter((item) => item.type === "matching")) {
    assert.equal(question.leftItems.length, question.rightItems.length);
    for (const left of question.leftItems) {
      assert.ok(Object.hasOwn(question.answer, left));
      assert.ok(question.rightItems.includes(question.answer[left]));
    }
  }
});

test("keeps student-facing data free of removed wording and unsupported topics", async () => {
  const theoryText = await read("app/data/theory.json");
  const questionText = await read("app/data/questions.json");
  const pageText = await read("app/page.tsx");
  const studentText = `${theoryText}\n${questionText}\n${pageText}`;
  const forbidden = [
    "처음 배우는 사람을 위한 설명",
    "문제에서 판단하는 기준",
    "문제 단서",
    "시험에 필요한 핵심 설명",
    "공개 평가 가이드",
    "공개평가",
    "학습 포인트",
    "형용사 이미지 스케일",
    "배색 이미지 스케일",
  ];
  for (const phrase of forbidden) assert.doesNotMatch(studentText, new RegExp(phrase));
  for (const phrase of ["OSI 7계층", "OSI 7 계층", "고립화 수준", "COMMIT·ROLLBACK", "SAVEPOINT"]) assert.doesNotMatch(theoryText, new RegExp(phrase));
});

test("shows verified English originals for representative loanwords", async () => {
  const { questions } = await loadJson("app/data/questions.json");
  const visibleStrings = questions.flatMap((question) => [question.question, question.explanation, ...(question.options ?? []), ...(question.leftItems ?? []), ...(question.rightItems ?? [])]);
  for (const [term, display] of [["싸이언", "싸이언(Cyan)"], ["마젠타", "마젠타(Magenta)"], ["컬러 피커", "컬러 피커(Color Picker)"]]) {
    const relevant = visibleStrings.filter((value) => value.includes(term));
    assert.ok(relevant.length > 0);
    assert.ok(relevant.every((value) => !new RegExp(`${term}(?!\\s*\\()`).test(value)));
    assert.ok(relevant.some((value) => value.includes(display)));
  }
});

test("implements the exact mock composition and all response types", async () => {
  const source = await read("app/page.tsx");
  assert.match(source, /Array\.from\(\{ length: 6 \}/);
  assert.match(source, /\["multiple", "multiple", "multiple", "short"\]/);
  assert.match(source, /\["multiple", "multiple", "ox", "short"\]/);
  assert.match(source, /questions\.length !== 40/);
  assert.match(source, /setTimeLeft\(90 \* 60\)/);
  assert.match(source, /normalize\("NFKC"\)/);
  assert.match(source, /choiceOrder: shuffled/);
  assert.match(source, /\{index \+ 1\}\. \{typeLabels\[question\.type\]\} - \{question\.unit\}/);
  assert.doesNotMatch(source, /question\.unit\} · 보통/);
  assert.match(source, /능력단위 요소 \{unit\.elements\.length\}개 · 필요지식 \{unitTopics\.length\}개/);
  for (const label of ["4지 택일형", "진위형", "연결형", "단답형"]) assert.match(source, new RegExp(label));
});

test("keeps responsive readability and avoids visual effects that can obscure content", async () => {
  const css = await read("app/globals.css");
  assert.match(css, /body\s*\{[^}]*font-size:\s*16px;[^}]*line-height:\s*1\.7/s);
  assert.match(css, /\.term-card p\s*\{[^}]*font-size:\s*17px/s);
  assert.match(css, /\.table-scroll\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.study-layout, \.quiz-layout\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/s);
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*?\.theory-pager\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|box-shadow|text-shadow/);
});
