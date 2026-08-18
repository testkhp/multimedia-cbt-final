"use client";

import { useEffect, useMemo, useState } from "react";
import theorySource from "./data/theory.json";
import questionSource from "./data/questions.json";

type View = "home" | "theory" | "practice" | "mock";
type QuestionType = "multiple" | "ox" | "matching" | "short";
type AnswerValue = string | Record<string, string>;

type TheoryTerm = { term: string; english: string; definition: string; distinction: string };
type TheoryTopic = {
  id: string;
  sourceId: string;
  elementId: string;
  title: string;
  explanations: string[];
  terms: TheoryTerm[];
  comparison: { columns: string[]; rows: string[][] } | null;
  example: string;
  questionIds: string[];
};
type TheoryElement = { id: string; number: string; title: string; topics: TheoryTopic[] };
type TheoryUnit = { id: string; name: string; code: string; summary: string; elements: TheoryElement[] };
type TheoryTopicWithElement = TheoryTopic & { elementNumber: string; elementTitle: string };
type Question = {
  id: string;
  unit: string;
  unitCode: string;
  learningContent: string;
  concept: string[];
  semanticClusterId: string;
  exclusionGroups: string[];
  type: QuestionType;
  difficulty: "보통";
  question: string;
  explanation: string;
  options?: string[];
  answer?: string | Record<string, string>;
  answers?: string[];
  normalizedAnswers?: string[];
  leftItems?: string[];
  rightItems?: string[];
};
type QuizQuestion = Question & { choiceOrder?: string[] };

const theory = theorySource as { units: TheoryUnit[] };
const bank = questionSource as { questions: Question[] };
const units = theory.units;
const typeLabels: Record<QuestionType, string> = {
  multiple: "4지 택일형",
  ox: "진위형",
  matching: "연결형",
  short: "단답형",
};
const practiceCounts = [5, 10, 15, 20];
const circledNumbers = ["①", "②", "③", "④"];

function topicsFor(unit: TheoryUnit): TheoryTopicWithElement[] {
  return unit.elements.flatMap((element) => element.topics.map((topicItem) => ({
    ...topicItem,
    elementNumber: element.number,
    elementTitle: element.title,
  })));
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function withChoiceOrder(question: Question): QuizQuestion {
  return question.type === "matching"
    ? { ...question, choiceOrder: shuffled(question.rightItems ?? []) }
    : { ...question };
}

function canAdd(question: Question, selected: Question[]) {
  if (selected.some((item) => item.semanticClusterId === question.semanticClusterId)) return false;
  const groups = new Set(selected.flatMap((item) => item.exclusionGroups));
  return !question.exclusionGroups.some((group) => groups.has(group));
}

function selectPractice(unitName: string, count: number): QuizQuestion[] {
  const candidates = shuffled(bank.questions.filter((question) => question.unit === unitName));
  const selected: Question[] = [];
  for (const question of candidates) {
    if (canAdd(question, selected)) selected.push(question);
    if (selected.length === count) break;
  }
  if (selected.length < count) {
    for (const question of candidates) {
      if (!selected.some((item) => item.id === question.id)) selected.push(question);
      if (selected.length === count) break;
    }
  }
  return selected.map(withChoiceOrder);
}

const mockTypePlan: QuestionType[][] = [
  ...Array.from({ length: 6 }, () => ["multiple", "ox", "matching", "short"] as QuestionType[]),
  ["multiple", "multiple", "multiple", "short"],
  ["multiple", "multiple", "multiple", "short"],
  ["multiple", "multiple", "ox", "short"],
  ["multiple", "multiple", "ox", "short"],
];

function selectMock(): QuizQuestion[] {
  const selected: Question[] = [];
  units.forEach((unit, unitIndex) => {
    shuffled(mockTypePlan[unitIndex]).forEach((type) => {
      const candidates = shuffled(
        bank.questions.filter(
          (question) => question.unit === unit.name && question.type === type && !selected.some((item) => item.id === question.id),
        ),
      );
      const choice = candidates.find((question) => canAdd(question, selected)) ?? candidates[0];
      if (choice) selected.push(choice);
    });
  });
  return selected.map(withChoiceOrder);
}

function normalizeAnswer(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/[\s.·\-_/]/g, "");
}

function isAnswered(question: Question, value?: AnswerValue) {
  if (question.type === "matching") {
    const mapping = typeof value === "object" && value ? value : {};
    return (question.leftItems ?? []).every((left) => Boolean(mapping[left]));
  }
  return typeof value === "string" && value.trim().length > 0;
}

function isCorrect(question: Question, value?: AnswerValue) {
  if (!isAnswered(question, value)) return false;
  if (question.type === "short") {
    const input = normalizeAnswer(String(value));
    const accepted = [...(question.answers ?? []).map(normalizeAnswer), ...(question.normalizedAnswers ?? []).map(normalizeAnswer)];
    return accepted.includes(input);
  }
  if (question.type === "matching") {
    const input = value as Record<string, string>;
    const answer = question.answer as Record<string, string>;
    return (question.leftItems ?? []).every((left) => input[left] === answer[left]);
  }
  return value === question.answer;
}

function answerLabel(question: Question) {
  if (question.type === "short") return question.answers?.[0] ?? "";
  if (question.type === "matching") {
    const answer = question.answer as Record<string, string>;
    return (question.leftItems ?? []).map((left, index) => `${String.fromCharCode(65 + index)}. ${left} — ${answer[left]}`).join(" / ");
  }
  if (question.type === "multiple") {
    const position = question.options?.findIndex((option) => option === question.answer) ?? -1;
    return `${circledNumbers[position] ?? ""} ${String(question.answer)}`.trim();
  }
  return String(question.answer);
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [activeUnitIndex, setActiveUnitIndex] = useState(0);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [practiceCount, setPracticeCount] = useState(10);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [graded, setGraded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90 * 60);

  const activeUnit = units[activeUnitIndex];
  const activeTopics = topicsFor(activeUnit);
  const activeSection = activeTopics[activeSectionIndex];
  const isMock = view === "mock";

  useEffect(() => {
    if (!isMock || quiz.length === 0 || graded) return;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setGraded(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [graded, isMock, quiz.length]);

  const openView = (next: View) => {
    setView(next);
    setQuiz([]);
    setAnswers({});
    setGraded(false);
    setTimeLeft(90 * 60);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const changeUnit = (index: number) => {
    setActiveUnitIndex(index);
    setActiveSectionIndex(0);
    document.querySelector(".study-layout")?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  const startPractice = () => {
    setQuiz(selectPractice(activeUnit.name, practiceCount));
    setAnswers({});
    setGraded(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const startMock = () => {
    const questions = selectMock();
    if (questions.length !== 40) return;
    setQuiz(questions);
    setAnswers({});
    setGraded(false);
    setTimeLeft(90 * 60);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const updateAnswer = (questionId: string, value: AnswerValue) => {
    if (graded) return;
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const gradeQuiz = () => {
    setGraded(true);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <button type="button" className="brand" onClick={() => openView("home")}>
            <strong>멀티미디어콘텐츠제작전문가</strong><span>이론 학습 · CBT 문제풀이</span>
          </button>
        </div>
      </header>

      <nav className="top-nav" aria-label="주요 메뉴">
        {([[
          "home", "홈",
        ], ["theory", "이론 학습"], ["practice", "능력단위별 문제"], ["mock", "종합 모의고사"]] as Array<[View, string]>).map(([key, label]) => (
          <button type="button" key={key} className={view === key ? "active" : ""} aria-current={view === key ? "page" : undefined} onClick={() => openView(key)}>{label}</button>
        ))}
      </nav>

      {view === "home" && <HomeView onOpen={openView} />}
      {view === "theory" && <TheoryView unit={activeUnit} unitIndex={activeUnitIndex} section={activeSection} sectionIndex={activeSectionIndex} onUnit={changeUnit} onSection={setActiveSectionIndex} onPractice={() => openView("practice")} />}
      {view === "practice" && <PracticeView unitIndex={activeUnitIndex} count={practiceCount} quiz={quiz} answers={answers} graded={graded} onUnit={(index) => { setActiveUnitIndex(index); setQuiz([]); }} onCount={(count) => { setPracticeCount(count); setQuiz([]); }} onStart={startPractice} onAnswer={updateAnswer} onGrade={gradeQuiz} />}
      {view === "mock" && <MockView quiz={quiz} answers={answers} graded={graded} timeLeft={timeLeft} onStart={startMock} onAnswer={updateAnswer} onGrade={gradeQuiz} />}

      <footer className="site-footer"><strong>MBC 컴퓨터아카데미 종로본점</strong><p>멀티미디어콘텐츠제작전문가 이론 학습 · CBT 문제풀이</p><small>Designed &amp; Developed by 권도현 강사 · © 2026 All Rights Reserved.</small></footer>
    </div>
  );
}

function HomeView({ onOpen }: { onOpen: (view: View) => void }) {
  return (
    <main className="page-container home-page">
      <section className="hero" aria-labelledby="home-title">
        <p className="eyebrow">MULTIMEDIA CONTENTS PROFESSIONAL</p>
        <h1 id="home-title">필수 능력단위 이론부터<br />실전형 문제풀이까지</h1>
        <p>10개 능력단위의 용어와 개념을 학습하고, 다양한 유형의 문제로 반복 연습할 수 있습니다.</p>
        <div className="hero-actions"><button type="button" className="primary-button" onClick={() => onOpen("theory")}>이론 학습 시작</button><button type="button" className="secondary-button" onClick={() => onOpen("practice")}>문제 풀기</button></div>
      </section>
      <section className="exam-summary" aria-labelledby="exam-title">
        <div className="section-heading"><h2 id="exam-title">1차 필기시험 구성</h2><p>문제 유형과 제한 시간을 확인한 뒤 학습을 시작하세요.</p></div>
        <div className="stat-grid"><article><strong>40문항</strong><span>전체 문항 수</span></article><article><strong>90분</strong><span>시험 시간</span></article><article><strong>30문항</strong><span>4지 택일형 · 진위형 · 연결형</span></article><article><strong>10문항</strong><span>단답형</span></article></div>
        <div className="type-breakdown"><div><b>4지 택일형</b><span>16문항</span></div><div><b>진위형</b><span>8문항</span></div><div><b>연결형</b><span>6문항</span></div><div><b>단답형</b><span>10문항</span></div></div>
      </section>
      <section className="unit-overview" aria-labelledby="unit-title">
        <div className="section-heading"><h2 id="unit-title">필수 능력단위 10개</h2><p>각 능력단위의 이론과 문제를 순서에 관계없이 선택할 수 있습니다.</p></div>
        <ol>{units.map((unit, index) => <li key={unit.id}><span>{String(index + 1).padStart(2, "0")}</span>{unit.name}</li>)}</ol>
      </section>
    </main>
  );
}

function TheoryView({ unit, unitIndex, section, sectionIndex, onUnit, onSection, onPractice }: { unit: TheoryUnit; unitIndex: number; section: TheoryTopicWithElement; sectionIndex: number; onUnit: (index: number) => void; onSection: (index: number) => void; onPractice: () => void }) {
  const unitTopics = topicsFor(unit);
  const changeSection = (index: number) => {
    onSection(index);
    document.querySelector(".theory-content")?.scrollIntoView({ behavior: "auto", block: "start" });
  };
  return (
    <main className="page-container">
      <section className="page-heading"><div><h1>능력단위별 이론</h1><p>용어와 개념을 하나씩 구분하여 학습할 수 있습니다.</p></div></section>
      <section className="unit-selector" aria-labelledby="theory-unit-title">
        <h2 id="theory-unit-title">필수 능력단위</h2>
        <div className="unit-list">{units.map((item, index) => <button type="button" key={item.id} className={unitIndex === index ? "selected" : ""} onClick={() => onUnit(index)}><span>{String(index + 1).padStart(2, "0")}</span>{item.name}</button>)}</div>
      </section>
      <section className="theory-header"><div><span>{unit.code}</span><h2>{unit.name}</h2><p>{unit.summary}</p></div><button type="button" className="primary-button" onClick={onPractice}>이 능력단위 문제 풀기</button></section>
      <div className="study-layout">
        <aside className="theory-toc" aria-label="이론 목차">
          <strong>능력단위 요소 {unit.elements.length}개 · 필요지식 {unitTopics.length}개</strong>
          <div className="element-toc">{unit.elements.map((element) => (
            <section key={element.id}>
              <h3><span>{element.number}</span>{element.title}</h3>
              <ol>{element.topics.map((topicItem) => {
                const index = unitTopics.findIndex((item) => item.id === topicItem.id);
                return <li key={topicItem.id}><button type="button" className={sectionIndex === index ? "active" : ""} onClick={() => changeSection(index)}><span>{String(index + 1).padStart(2, "0")}</span><b>{topicItem.title}</b></button></li>;
              })}</ol>
            </section>
          ))}</div>
        </aside>
        <article className="theory-content">
          <header className="content-heading"><span>{section.elementNumber}. {section.elementTitle}</span><h2>{section.title}</h2><small>필요지식 {sectionIndex + 1} / {unitTopics.length}</small></header>
          <div className="explanation-list">{section.explanations.map((paragraph, index) => <p className="overview" key={`${section.id}-explanation-${index}`}>{paragraph}</p>)}</div>
          <div className="term-list">{section.terms.map((item, index) => <section className="term-card" key={`${section.id}-${item.term}-${index}`}><h3>{item.term}{item.english && <small>({item.english})</small>}</h3><p>{item.definition}</p>{item.distinction && <p className="term-note">{item.distinction}</p>}</section>)}</div>
          {section.comparison && <section className="comparison-block"><h3>개념 비교</h3><div className="table-scroll"><table><thead><tr>{section.comparison.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{section.comparison.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div></section>}
          {section.example && <section className="example-block"><h3>예시</h3><p>{section.example}</p></section>}
          <nav className="theory-pager" aria-label="이전 다음 이론"><button type="button" disabled={sectionIndex === 0} onClick={() => changeSection(sectionIndex - 1)}><span>이전</span><b>{sectionIndex > 0 ? unitTopics[sectionIndex - 1].title : "첫 번째 이론"}</b></button><button type="button" disabled={sectionIndex === unitTopics.length - 1} onClick={() => changeSection(sectionIndex + 1)}><span>다음</span><b>{sectionIndex < unitTopics.length - 1 ? unitTopics[sectionIndex + 1].title : "마지막 이론"}</b></button></nav>
        </article>
      </div>
    </main>
  );
}

function PracticeView({ unitIndex, count, quiz, answers, graded, onUnit, onCount, onStart, onAnswer, onGrade }: { unitIndex: number; count: number; quiz: QuizQuestion[]; answers: Record<string, AnswerValue>; graded: boolean; onUnit: (index: number) => void; onCount: (count: number) => void; onStart: () => void; onAnswer: (id: string, value: AnswerValue) => void; onGrade: () => void }) {
  if (quiz.length === 0) {
    return (
      <main className="page-container setup-page">
        <section className="page-heading"><div><h1>능력단위별 문제</h1><p>학습할 능력단위와 문항 수를 선택하세요. 시간 제한과 점수 표시는 없습니다.</p></div></section>
        <section className="setup-card">
          <fieldset><legend>능력단위</legend><div className="setup-unit-grid">{units.map((unit, index) => <label key={unit.id} className={unitIndex === index ? "selected" : ""}><input type="radio" name="practice-unit" checked={unitIndex === index} onChange={() => onUnit(index)} /><span>{String(index + 1).padStart(2, "0")}</span><b>{unit.name}</b></label>)}</div></fieldset>
          <fieldset><legend>문항 수</legend><div className="count-options">{practiceCounts.map((value) => <label key={value} className={count === value ? "selected" : ""}><input type="radio" name="practice-count" checked={count === value} onChange={() => onCount(value)} /><b>{value}문항</b></label>)}</div></fieldset>
          <button type="button" className="primary-button start-button" onClick={onStart}>문제 풀기 시작</button>
        </section>
      </main>
    );
  }
  return <QuizView title={`${units[unitIndex].name} 문제`} subtitle={`${quiz.length}문항 · 시간 제한 없음`} quiz={quiz} answers={answers} graded={graded} mode="practice" onAnswer={onAnswer} onGrade={onGrade} onRestart={onStart} />;
}

function MockView({ quiz, answers, graded, timeLeft, onStart, onAnswer, onGrade }: { quiz: QuizQuestion[]; answers: Record<string, AnswerValue>; graded: boolean; timeLeft: number; onStart: () => void; onAnswer: (id: string, value: AnswerValue) => void; onGrade: () => void }) {
  if (quiz.length === 0) {
    return (
      <main className="page-container setup-page">
        <section className="page-heading"><div><h1>종합 모의고사</h1><p>실제 시험 구성에 맞춰 10개 능력단위에서 40문항이 출제됩니다.</p></div></section>
        <section className="mock-intro"><div className="mock-facts"><div><strong>40</strong><span>문항</span></div><div><strong>90</strong><span>분</span></div><div><strong>10</strong><span>능력단위</span></div></div><ul><li>각 능력단위에서 4문항씩 출제됩니다.</li><li>4지 택일형 16문항, 진위형 8문항, 연결형 6문항, 단답형 10문항입니다.</li><li>제출하거나 제한 시간이 끝나면 점수와 문항별 해설을 확인할 수 있습니다.</li></ul><button type="button" className="primary-button start-button" onClick={onStart}>모의고사 시작</button></section>
      </main>
    );
  }
  return <QuizView title="종합 모의고사" subtitle="40문항 · 90분" quiz={quiz} answers={answers} graded={graded} mode="mock" timeLeft={timeLeft} onAnswer={onAnswer} onGrade={onGrade} onRestart={onStart} />;
}

function QuizView({ title, subtitle, quiz, answers, graded, mode, timeLeft, onAnswer, onGrade, onRestart }: { title: string; subtitle: string; quiz: QuizQuestion[]; answers: Record<string, AnswerValue>; graded: boolean; mode: "practice" | "mock"; timeLeft?: number; onAnswer: (id: string, value: AnswerValue) => void; onGrade: () => void; onRestart: () => void }) {
  const answeredCount = useMemo(() => quiz.filter((question) => isAnswered(question, answers[question.id])).length, [answers, quiz]);
  const correctCount = useMemo(() => quiz.filter((question) => isCorrect(question, answers[question.id])).length, [answers, quiz]);
  const score = Math.round((correctCount / quiz.length) * 1000) / 10;
  return (
    <main className="page-container quiz-page">
      <section className="quiz-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{mode === "mock" && <div className={`timer ${(timeLeft ?? 0) < 600 ? "urgent" : ""}`}><span>남은 시간</span><strong>{formatTime(timeLeft ?? 0)}</strong></div>}</section>
      {graded && <section className="result-banner" aria-live="polite"><div><strong>채점 완료</strong><p>문항별 정답과 해설을 확인하세요.</p></div>{mode === "mock" && <div className="score"><b>{score}</b><span>점</span><small>{correctCount} / {quiz.length}문항 정답</small></div>}</section>}
      <div className="quiz-layout">
        <article className="question-list">{quiz.map((question, index) => <QuestionCard key={question.id} question={question} index={index} value={answers[question.id]} graded={graded} onAnswer={(value) => onAnswer(question.id, value)} />)}<section className="submit-panel">{!graded ? <><p>{answeredCount} / {quiz.length}문항에 응답했습니다. 미응답 문항이 있어도 제출할 수 있습니다.</p><button type="button" className="primary-button" onClick={onGrade}>답안 제출</button></> : <><p>정답과 해설을 확인한 뒤 새 문제로 다시 풀어보세요.</p><button type="button" className="primary-button" onClick={onRestart}>새 문제 풀기</button></>}</section></article>
        <aside className="quiz-progress" aria-label="문항 진행 상황"><strong>문항 진행</strong>{mode === "mock" && <p className="side-time">남은 시간 <b>{formatTime(timeLeft ?? 0)}</b></p>}<div className="progress-meter"><span style={{ width: `${(answeredCount / quiz.length) * 100}%` }} /></div><p><b>{answeredCount}</b> / {quiz.length}문항 응답</p><div className="question-jump">{quiz.map((question, index) => { const answered = isAnswered(question, answers[question.id]); const correct = isCorrect(question, answers[question.id]); const state = graded ? (correct ? "correct" : answered ? "incorrect" : "unanswered") : answered ? "answered" : ""; return <a href={`#question-${index + 1}`} key={question.id} className={state}>{index + 1}</a>; })}</div></aside>
      </div>
    </main>
  );
}

function QuestionCard({ question, index, value, graded, onAnswer }: { question: QuizQuestion; index: number; value?: AnswerValue; graded: boolean; onAnswer: (value: AnswerValue) => void }) {
  const answered = isAnswered(question, value);
  const correct = isCorrect(question, value);
  const state = graded ? (correct ? "correct" : answered ? "incorrect" : "unanswered") : "";
  return (
    <section id={`question-${index + 1}`} className={`question-card ${state}`} data-question-id={question.id}>
      <header><h2>{index + 1}. {typeLabels[question.type]} - {question.unit}</h2></header>
      <p className="question-text">{question.question}</p>
      {question.type === "multiple" && <div className="choice-list" role="radiogroup" aria-label={`${index + 1}번 답안`}>{(question.options ?? []).map((option, optionIndex) => <label key={option} className={value === option ? "selected" : ""}><input type="radio" name={question.id} checked={value === option} onChange={() => onAnswer(option)} disabled={graded} /><span>{circledNumbers[optionIndex]}</span><b>{option}</b></label>)}</div>}
      {question.type === "ox" && <div className="ox-choices" role="radiogroup" aria-label={`${index + 1}번 답안`}>{["O", "X"].map((option) => <label key={option} className={value === option ? "selected" : ""}><input type="radio" name={question.id} checked={value === option} onChange={() => onAnswer(option)} disabled={graded} /><span>{option}</span></label>)}</div>}
      {question.type === "short" && <label className="short-answer"><span>답안 입력</span><input type="text" value={typeof value === "string" ? value : ""} onChange={(event) => onAnswer(event.target.value)} disabled={graded} autoComplete="off" placeholder="용어를 입력하세요." /></label>}
      {question.type === "matching" && <div className="matching-list">{(question.leftItems ?? []).map((left, leftIndex) => { const mapping = typeof value === "object" && value ? value : {}; return <label key={left}><span><b>{String.fromCharCode(65 + leftIndex)}</b>{left}</span><select value={mapping[left] ?? ""} onChange={(event) => onAnswer({ ...mapping, [left]: event.target.value })} disabled={graded} aria-label={`${left} 설명 선택`}><option value="">설명을 선택하세요.</option>{(question.choiceOrder ?? question.rightItems ?? []).map((description) => <option key={description} value={description}>{description}</option>)}</select></label>; })}</div>}
      {graded && <div className={`answer-feedback ${state}`}><strong>{!answered ? "미응답" : correct ? "정답" : "오답"}</strong><p><b>정답</b><span>{answerLabel(question)}</span></p><p><b>해설</b><span>{question.explanation}</span></p></div>}
    </section>
  );
}
