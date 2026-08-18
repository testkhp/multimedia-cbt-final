import fs from "node:fs";
import path from "node:path";

const sourceRoot = "/workspace/scratch/182d468d9cad/output";
const outputRoot = path.resolve("app/data");
const auditRoot = path.resolve("docs");

const theorySource = JSON.parse(
  fs.readFileSync(
    path.join(sourceRoot, "student_theory_final_v5/core_theory_10_units_student_final_v5.json"),
    "utf8",
  ),
);
const bankSource = JSON.parse(
  fs.readFileSync(path.join(sourceRoot, "master_question_bank_600_student_solver_quality_enhanced.json"), "utf8"),
);

const richTheoryFiles = [
  "digital_color_operation_core_theory_ncs_terms_v3.json",
  "animation_core_theory_ncs_terms_v3.json",
  "comprehensive_editing_core_theory.json",
  "sw_foundation_core_theory.json",
  "storyboard_production_core_theory.json",
  "ui_implementation_core_theory.json",
  "design_component_design_core_theory.json",
  "cgi_vfx_core_theory.json",
  "design_component_production_core_theory.json",
  "video_content_planning_core_theory.json",
];
const richSections = new Map();
for (const file of richTheoryFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(sourceRoot, file), "utf8"));
  for (const section of data.sections) richSections.set(section.id, section);
}

const bilingualTerms = new Map();
for (const question of bankSource.questions) {
  for (const display of question.term_originals ?? []) {
    const match = String(display).match(/^([^()]+)\(([^()]+)\)$/);
    if (match && /[가-힣]/.test(match[1])) bilingualTerms.set(match[1].trim(), `${match[1].trim()}(${match[2].trim()})`);
  }
}
for (const [korean, display] of [
  ["싸이언", "싸이언(Cyan)"],
  ["마젠타", "마젠타(Magenta)"],
  ["컬러 피커", "컬러 피커(Color Picker)"],
]) bilingualTerms.set(korean, display);
const bilingualEntries = [...bilingualTerms.entries()].sort((a, b) => b[0].length - a[0].length);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cleanText = (value = "") =>
  String(value)
    .replaceAll("문제에서 판단하는 기준", "구분")
    .replaceAll("시험에 필요한 핵심 설명", "")
    .replaceAll("처음 배우는 사람을 위한 설명", "")
    .replaceAll("문제 단서", "")
    .replaceAll("공개 평가 가이드", "")
    .replaceAll("공개평가", "")
    .replaceAll("형용사 이미지 스케일", "배색 이미지")
    .replaceAll("배색 이미지 스케일", "배색 이미지")
    .replaceAll("스케일에서 확인한 배색", "선정한 배색")
    .replaceAll("배색 이미지과", "배색 이미지와")
    .replaceAll("학습모듈은 ", "")
    .replaceAll("학습모듈의 ", "")
    .replaceAll("모듈 기준으로 ", "")
    .replaceAll("모듈은 ", "")
    .replaceAll("원문 도해 요소", "요소")
    .replace(/\s+/g, " ")
    .trim();

const studentText = (value = "") => {
  let result = cleanText(value);
  for (const [korean, display] of bilingualEntries) {
    result = result.replace(new RegExp(`${escapeRegExp(korean)}(?!\\s*\\()`, "g"), display);
  }
  return result;
};

const studentAnswer = (answer) => {
  if (typeof answer === "string") return studentText(answer);
  if (!answer || typeof answer !== "object") return answer;
  return Object.fromEntries(Object.entries(answer).map(([key, value]) => [studentText(key), studentText(value)]));
};

const topic = (sourceId, options = {}) => ({ sourceId, ...options });

// 실제 학습모듈의 능력단위 요소 순서에 맞춘 목차이다.
// 한 주제가 둘 이상의 요소와 관련될 때에는 개념을 처음 학습하는 요소에 배치하고,
// 자막·크레딧처럼 내용이 분명히 나뉘는 경우에만 용어를 분리한다.
const elementRegistry = {
  "digital-color": [
    ["1-1", "프로파일 구성 및 색채 팔레트 제작", [topic("DC-CORE-01"), topic("DC-CORE-02"), topic("DC-CORE-03")]],
    ["1-2", "컬러 시뮬레이션 및 컬러 도서 제작", [topic("DC-CORE-04"), topic("DC-CORE-05")]],
    ["2-1", "디지털 시뮬레이션 재질 및 색채 제작", [topic("DC-CORE-06"), topic("DC-CORE-07")]],
    ["2-2", "렌더링 컬러 보정 및 이미지 제작", [topic("DC-CORE-08"), topic("DC-CORE-09")]],
    ["3-1", "출력 매체 검토", [topic("DC-CORE-10"), topic("DC-CORE-11"), topic("DC-CORE-12"), topic("DC-CORE-13")]],
    ["3-2", "컬러매니지먼트 시스템의 적용 및 응용", [topic("DC-CORE-14"), topic("DC-CORE-15"), topic("DC-CORE-16"), topic("DC-CORE-17"), topic("DC-CORE-18")]],
  ],
  animation: [
    ["1-1", "리깅 방향 계획", [topic("AN-CORE-01")]],
    ["1-2", "리깅하기", [topic("AN-CORE-02"), topic("AN-CORE-04")]],
    ["1-3", "문제 해결 능력", [topic("AN-CORE-03", { title: "IK Solver와 관절 제어" })]],
    ["2-1", "애니메이션 계획", [topic("AN-CORE-05"), topic("AN-CORE-07"), topic("AN-CORE-08"), topic("AN-CORE-10")]],
    ["2-2", "애니메이션 구현", [topic("AN-CORE-06"), topic("AN-CORE-09")]],
    ["3-1", "디지타이징 계획", [topic("AN-CORE-11")]],
    ["3-2", "디지타이징하기", [topic("AN-CORE-12")]],
    ["3-3", "문제 해결 능력", [topic("AN-CORE-13"), topic("AN-CORE-14")]],
  ],
  "comprehensive-editing": [
    ["1-1", "서브타이틀 기획", [topic("CE-CORE-01", { id: "CE-CORE-01A", title: "서브타이틀과 자막 유형", terms: ["폐쇄 자막", "실시간 자막", "오픈 자막"] })]],
    ["1-2", "서브타이틀 제작", [topic("CE-CORE-02")]],
    ["1-3", "자막 및 크레딧 제작 및 합성", [topic("CE-CORE-01", { id: "CE-CORE-01B", title: "크레딧과 타이틀", terms: ["크레딧", "타이틀"] })]],
    ["1-4", "자막 수정 및 변경", [topic("CE-CORE-03")]],
    ["2-1", "비디오 신호 분석 및 수정", [topic("CE-CORE-04"), topic("CE-CORE-05"), topic("CE-CORE-06"), topic("CE-CORE-07")]],
    ["2-2", "오디오 신호 분석 및 수정", [topic("CE-CORE-08"), topic("CE-CORE-09")]],
    ["2-3", "최종 영상 작품 분석 및 수정", [topic("CE-CORE-10"), topic("CE-CORE-11")]],
    ["3-1", "타이틀 제작", [topic("CE-CORE-12")]],
    ["3-2", "컴퓨터 그래픽의 합성", [topic("CE-CORE-13")]],
    ["3-3", "영상 그래픽의 수정 및 보완", [topic("CE-CORE-14")]],
    ["3-4", "최종 편집", [topic("CE-CORE-15")]],
    ["3-5", "최종 마스터링", [topic("CE-CORE-16")]],
  ],
  "sw-foundation": [
    ["1-1", "네트워크 프로토콜 활용", [topic("SW-CORE-01"), topic("SW-CORE-02"), topic("SW-CORE-04"), topic("SW-CORE-05"), topic("SW-CORE-06"), topic("SW-CORE-07"), topic("SW-CORE-08"), topic("2001020232_23v5-KNOWLEDGE-01", { title: "프로토콜의 구성과 기능" })]],
    ["2-1", "미들웨어 파악", [topic("SW-CORE-09"), topic("SW-CORE-10"), topic("SW-CORE-11")]],
    ["2-2", "미들웨어 운용", [topic("SW-CORE-12")]],
    ["3-1", "데이터베이스 특징 식별", [topic("SW-CORE-13"), topic("SW-CORE-14", { title: "회복 관리" }), topic("2001020232_23v5-KNOWLEDGE-02", { title: "데이터베이스의 주요 특성" })]],
    ["3-2", "관계형 데이터베이스 테이블 정의", [topic("SW-CORE-15"), topic("SW-CORE-16"), topic("2001020232_23v5-KNOWLEDGE-03", { title: "필수 속성과 관계 기수성" })]],
    ["3-3", "관계형 데이터베이스 테이블 조작", [topic("SW-CORE-17"), topic("SW-CORE-18"), topic("SW-CORE-19", { title: "NOT NULL과 ON DELETE CASCADE" }), topic("2001020232_23v5-KNOWLEDGE-04", { title: "ALTER를 이용한 테이블 변경" })]],
  ],
  storyboard: [
    ["1-1", "이미지보드 제작하기", [topic("SB-CORE-01"), topic("SB-CORE-02")]],
    ["1-2", "스토리보드 제작하기", Array.from({ length: 13 }, (_, index) => topic(`SB-CORE-${String(index + 3).padStart(2, "0")}`))],
  ],
  "ui-implementation": [
    ["1-1", "UI 설계 내용 확인", [topic("UI-CORE-01"), topic("UI-CORE-02"), topic("UI-CORE-03")]],
    ["1-2", "UI 메뉴 구조 확인", [topic("UI-CORE-04")]],
    ["2-1", "UI 설계 구현", [topic("UI-CORE-06"), topic("UI-CORE-07")]],
    ["2-2", "UI 제어 구현", Array.from({ length: 6 }, (_, index) => topic(`UI-CORE-${String(index + 8).padStart(2, "0")}`))],
    ["2-3", "UI 테스트 설계", [topic("UI-CORE-05"), ...Array.from({ length: 4 }, (_, index) => topic(`UI-CORE-${String(index + 14).padStart(2, "0")}`))]],
  ],
  "design-component-design": [
    ["1-1", "정보 설계", Array.from({ length: 5 }, (_, index) => topic(`DES-CORE-${String(index + 1).padStart(2, "0")}`))],
    ["2-1", "디자인 가이드 구성", Array.from({ length: 3 }, (_, index) => topic(`DES-CORE-${String(index + 6).padStart(2, "0")}`))],
    ["3-1", "UI 구성요소 설계", Array.from({ length: 4 }, (_, index) => topic(`DES-CORE-${String(index + 9).padStart(2, "0")}`))],
    ["4-1", "매체별 구성요소 분석", Array.from({ length: 3 }, (_, index) => topic(`DES-CORE-${String(index + 13).padStart(2, "0")}`))],
  ],
  "cgi-vfx": [
    ["1-1", "CGI / VFX 분석", [topic("CV-CORE-01"), topic("CV-CORE-02")]],
    ["1-2", "CGI / VFX 연출", [topic("CV-CORE-04"), topic("CV-CORE-05")]],
    ["2-1", "영상 합성 분석", [topic("CV-CORE-03"), topic("CV-CORE-06"), topic("CV-CORE-07"), topic("CV-CORE-08")]],
    ["2-2", "영상 합성 연출", [topic("CV-CORE-09")]],
    ["3-1", "색보정 표준 규격 준수", [topic("CV-CORE-10"), topic("CV-CORE-11"), topic("CV-CORE-12")]],
    ["3-2", "컬러 콘셉트 설계", [topic("CV-CORE-13")]],
    ["3-3", "컬러 콘셉트 연출", [topic("CV-CORE-14"), topic("CV-CORE-15")]],
  ],
  "design-component-production": [
    ["1-1", "와이어 프레임 작성", [topic("DCP-CORE-01")]],
    ["1-2", "스토리보드 작성", [topic("DCP-CORE-02"), topic("DCP-CORE-03")]],
    ["2-1", "심미적 요소 표현", Array.from({ length: 5 }, (_, index) => topic(`DCP-CORE-${String(index + 4).padStart(2, "0")}`))],
    ["3-1", "UI 제작", Array.from({ length: 3 }, (_, index) => topic(`DCP-CORE-${String(index + 9).padStart(2, "0")}`))],
    ["3-2", "UX 구성요소 적용", [topic("DCP-CORE-12"), topic("DCP-CORE-13")]],
    ["4-1", "디자인 제작 및 표준화", [topic("DCP-CORE-14"), topic("DCP-CORE-15")]],
  ],
  "video-content-planning": [
    ["1-1", "아이템 선정", [topic("VCP-CORE-01"), topic("VCP-CORE-02")]],
    ["2-1", "기획팀 구성과 기획서 작성", [topic("VCP-CORE-03"), topic("VCP-CORE-04"), topic("VCP-CORE-05"), topic("VCP-CORE-06"), topic("VCP-CORE-15")]],
    ["2-2", "구체적인 제작 계획과 예산 확보 전략 수립", [topic("VCP-CORE-08"), ...Array.from({ length: 5 }, (_, index) => topic(`VCP-CORE-${String(index + 9).padStart(2, "0")}`))]],
    ["3-1", "스태프 구성", [topic("VCP-CORE-07"), topic("VCP-CORE-14")]],
  ],
};

const knowledgeEnhancements = {
  "SW-CORE-14": [
    "데이터베이스를 사용하던 중 전원 장애, 저장 장치 오류, 프로그램 오류가 발생하면 일부 데이터가 사라지거나 서로 맞지 않는 상태가 될 수 있다. 회복 관리는 이러한 손실과 결함을 확인하고 데이터베이스를 장애가 발생하기 전의 정상 상태로 되돌리는 DBMS 기능이다.",
    "DBMS는 변경 내용을 기록한 로그와 정기적으로 보관한 백업을 이용해 복구 범위를 판단한다. 장애가 발생하기 전 정상적으로 완료된 변경은 유지하고, 완료되지 못해 데이터의 일관성을 해칠 수 있는 변경은 취소하거나 다시 적용한다. 보안 관리가 비인가 접근을 막는 기능이라면 회복 관리는 장애 이후 정상 상태를 복원하는 기능이다.",
  ],
  "SW-CORE-19": [
    "관계형 데이터베이스의 제약조건은 잘못된 값이 저장되지 않도록 테이블이 지켜야 할 규칙을 정한다. NOT NULL은 해당 열에 반드시 값이 존재하도록 하며, 외래키는 자식 테이블의 값이 부모 테이블의 유효한 행을 참조하도록 만든다.",
    "ON DELETE CASCADE는 부모 테이블의 행을 삭제할 때 그 행을 외래키로 참조하는 자식 행도 함께 삭제하는 참조 동작이다. NOT NULL이 한 열의 값 존재 여부를 제한한다면 ON DELETE CASCADE는 서로 연결된 두 테이블에서 삭제가 전파되는 방식을 정한다. 연결된 데이터가 함께 사라지므로 관계와 사용 목적을 확인한 뒤 적용해야 한다.",
  ],
  "2001020232_23v5-KNOWLEDGE-01": [
    "네트워크 프로토콜은 서로 다른 장치가 데이터를 같은 방식으로 해석하도록 데이터 구조와 형식을 나타내는 구문, 각 부분의 뜻을 정하는 의미, 전송 시점과 속도를 정하는 타이밍을 약속한다. 이 세 요소가 맞지 않으면 송신자가 보낸 데이터를 수신자가 올바르게 해석하거나 제때 처리할 수 없다.",
    "프로토콜은 한 통신 선로를 여러 시스템이 함께 쓰게 하는 다중화, 송신지와 목적지를 나타내는 주소 설정, 전달 정보를 헤더로 붙이는 캡슐화, 데이터를 정한 크기로 나누고 다시 합치는 단편화·재조립, 순서·오류·흐름 제어 기능을 수행한다. IP 주소와 포트 번호, MAC 주소는 사용하는 계층과 식별 대상이 다르므로 서로 구분해야 한다.",
  ],
  "2001020232_23v5-KNOWLEDGE-02": [
    "데이터베이스는 여러 사용자와 응용소프트웨어가 데이터를 함께 이용할 수 있도록 구성한 저장 체계이다. 요청한 결과를 바로 제공하는 실시간 접근성, 입력·수정·삭제에 따라 내용이 계속 달라지는 계속적 변화, 여러 사용자가 동시에 이용하는 동시 공용, 저장 위치가 아니라 값과 조건으로 찾는 내용에 의한 참조가 주요 특성이다.",
    "DBMS는 데이터 저장뿐 아니라 장애가 발생했을 때 정상 상태로 되돌리는 회복 관리와 허가받지 않은 접근을 막는 보안 관리도 담당한다. 회복 관리는 손상이나 손실 이후의 복구에, 보안 관리는 접근 권한과 중요 정보 보호에 초점이 있다는 차이가 있다.",
  ],
  "2001020232_23v5-KNOWLEDGE-03": [
    "테이블을 정의할 때 속성에 값이 반드시 있어야 하는지, 없어도 되는지를 구분한다. 필수 속성은 모든 인스턴스에 값이 존재해야 하며 선택 속성은 상황에 따라 값이 없을 수 있다. 이 조건은 데이터 누락을 막는 제약조건과 연결된다.",
    "관계 기수성은 한 개체의 인스턴스 하나가 다른 개체의 인스턴스 몇 개와 관계를 맺는지를 나타낸다. 일대일, 일대다, 다대다 관계를 구분하면 기본키와 외래키를 어디에 둘지 판단하고 테이블 구조를 올바르게 설계할 수 있다.",
  ],
  "2001020232_23v5-KNOWLEDGE-04": [
    "ALTER는 이미 만들어진 테이블의 구조를 변경하는 DDL 명령어이다. 열을 추가·변경·삭제하거나 제약조건을 추가하고 수정할 때 사용하며, 데이터를 조회하거나 개별 행의 값을 바꾸는 명령과는 목적이 다르다.",
    "CREATE가 새 테이블을 정의하고 DROP이 테이블 자체를 제거한다면 ALTER는 기존 테이블을 유지하면서 속성, 도메인, 제약조건 같은 구조를 바꾼다. 구조 변경은 기존 데이터와 다른 테이블의 참조 관계에 영향을 줄 수 있으므로 변경 대상을 먼저 확인해야 한다.",
  ],
};

const baseUnits = new Map(theorySource.units.map((unit) => [unit.id, unit]));
const baseSections = new Map(theorySource.units.flatMap((unit) => unit.sections.map((section) => [section.id, section])));

const makeTopic = (spec, elementId) => {
  const base = baseSections.get(spec.sourceId);
  if (!base) throw new Error(`이론 원본을 찾을 수 없음: ${spec.sourceId}`);
  const rich = richSections.get(spec.sourceId);
  const explanations = knowledgeEnhancements[spec.sourceId]
    ?? [rich?.beginner_foundation || base.overview, rich?.mechanism]
      .map(cleanText)
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index);
  const terms = base.terms
    .filter((termItem) => !spec.terms || spec.terms.includes(termItem.term))
    .filter((termItem) => !(spec.sourceId === "CE-CORE-01" && termItem.term === "마스터링"))
    .map((termItem) => ({
      term: cleanText(termItem.term),
      english: cleanText(termItem.en),
      definition: cleanText(termItem.definition),
      distinction: cleanText(termItem.distinction),
    }));
  if (!terms.length) throw new Error(`용어가 없는 이론 주제: ${spec.id ?? spec.sourceId}`);
  return {
    id: spec.id ?? spec.sourceId,
    sourceId: spec.sourceId,
    elementId,
    title: cleanText(spec.title ?? rich?.title ?? base.title),
    explanations,
    terms,
    comparison: base.comparison
      ? {
          columns: base.comparison.columns.map((column) => cleanText(column) === "판단 기준" ? "설명" : cleanText(column)),
          rows: base.comparison.rows
            .filter((row) => !["Soft / Hard", "Dynamic / Static"].includes(row[0]))
            .map((row) => row.map(cleanText)),
        }
      : null,
    example: cleanText(base.example),
    questionIds: base.related_question_ids,
  };
};

const theory = {
  version: "student-element-knowledge-v6",
  units: Object.entries(elementRegistry).map(([unitId, elements]) => {
    const base = baseUnits.get(unitId);
    if (!base) throw new Error(`능력단위 원본을 찾을 수 없음: ${unitId}`);
    return {
      id: unitId,
      name: cleanText(base.name),
      code: base.code,
      summary: `${elements.map(([, title]) => cleanText(title)).join(", ")}에 관한 이론과 용어를 다룬다.`,
      elements: elements.map(([number, title, topicSpecs]) => ({
        id: `${unitId}-${number}`,
        number,
        title: cleanText(title),
        topics: topicSpecs.map((topicSpec) => makeTopic(topicSpec, `${unitId}-${number}`)),
      })),
    };
  }),
};

const profileTerm = theory.units[0].elements[0].topics[0].terms.find((termItem) => termItem.term === "프로파일");
if (profileTerm) {
  profileTerm.definition = "조정된 장치가 실제로 색을 어떻게 재현하는지 측정하여 기록한 정보 파일이다.";
  profileTerm.distinction = "프로파일링(Profiling)은 장치의 색 재현 특성을 측정하여 프로파일을 만드는 과정이다.";
}

const questions = {
  version: "student-solver-quality-enhanced",
  questions: bankSource.questions.map((question) => ({
    id: question.id,
    unit: question.unit,
    unitCode: question.unit_code,
    learningContent: cleanText(question.learning_content),
    concept: question.concept,
    semanticClusterId: question.semantic_cluster_id,
    exclusionGroups: question.simultaneous_exclusion_groups ?? [],
    type: question.type,
    difficulty: "보통",
    question: studentText(question.question),
    explanation: studentText(question.explanation),
    ...(question.options ? { options: question.options.map(studentText) } : {}),
    ...(question.type === "short"
      ? {
          answers: [...new Set([...question.answers.map(studentText), ...question.answers.map(cleanText)])],
          normalizedAnswers: question.normalized_answers ?? [],
        }
      : {}),
    ...(question.type !== "short" ? { answer: studentAnswer(question.answer) } : {}),
    ...(question.leftItems ? { leftItems: question.leftItems.map(studentText) } : {}),
    ...(question.rightItems ? { rightItems: question.rightItems.map(studentText) } : {}),
  })),
};

const topics = theory.units.flatMap((unit) => unit.elements.flatMap((element) => element.topics));
const questionIds = new Set(questions.questions.map((question) => question.id));
const questionsById = new Map(questions.questions.map((question) => [question.id, question]));
const linkedQuestionIds = new Set(topics.flatMap((topicItem) => topicItem.questionIds));
const unlinkedQuestionIds = [...questionIds].filter((id) => !linkedQuestionIds.has(id));
const invalidQuestionIds = [...linkedQuestionIds].filter((id) => !questionIds.has(id));
const crossUnitLinks = theory.units.flatMap((unit) => unit.elements.flatMap((element) => element.topics.flatMap((topicItem) =>
  topicItem.questionIds
    .filter((id) => questionsById.get(id)?.unit !== unit.name)
    .map((id) => ({ topicId: topicItem.id, questionId: id, theoryUnit: unit.name, questionUnit: questionsById.get(id)?.unit })),
)));
const sourceIds = new Set(topics.map((topicItem) => topicItem.sourceId));
const unusedSourceIds = [...baseSections.keys()].filter((id) => !sourceIds.has(id));

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
const serializedStudentText = JSON.stringify({ theory, questions });
const violations = forbidden.filter((phrase) => serializedStudentText.includes(phrase));
if (violations.length) throw new Error(`학생용 데이터 금지 문구 발견: ${violations.join(", ")}`);
if (theory.units.length !== 10 || questions.questions.length !== 600) {
  throw new Error(`데이터 수 불일치: 이론 ${theory.units.length}개, 문제 ${questions.questions.length}개`);
}
if (unlinkedQuestionIds.length || invalidQuestionIds.length || crossUnitLinks.length || unusedSourceIds.length) {
  throw new Error(`연계 오류: 미연결 ${unlinkedQuestionIds.length}, 잘못된 문항 ${invalidQuestionIds.length}, 타 능력단위 연결 ${crossUnitLinks.length}, 미사용 이론 ${unusedSourceIds.length}`);
}
if (topics.some((topicItem) => topicItem.explanations.join(" ").length < 250)) {
  throw new Error("설명이 250자보다 짧은 이론 주제가 있습니다.");
}

const audit = {
  version: theory.version,
  units: theory.units.length,
  elements: theory.units.reduce((sum, unit) => sum + unit.elements.length, 0),
  topics: topics.length,
  terms: topics.reduce((sum, topicItem) => sum + topicItem.terms.length, 0),
  questions: questions.questions.length,
  linkedQuestions: linkedQuestionIds.size,
  unlinkedQuestionIds,
  invalidQuestionIds,
  crossUnitLinks,
  unusedSourceIds,
  perUnit: theory.units.map((unit) => ({
    unit: unit.name,
    elements: unit.elements.length,
    topics: unit.elements.reduce((sum, element) => sum + element.topics.length, 0),
    terms: unit.elements.reduce((sum, element) => sum + element.topics.reduce((termSum, topicItem) => termSum + topicItem.terms.length, 0), 0),
    questions: questions.questions.filter((question) => question.unit === unit.name).length,
    linkedQuestions: new Set(unit.elements.flatMap((element) => element.topics.flatMap((topicItem) => topicItem.questionIds))).size,
  })),
};

fs.mkdirSync(outputRoot, { recursive: true });
fs.mkdirSync(auditRoot, { recursive: true });
fs.writeFileSync(path.join(outputRoot, "theory.json"), `${JSON.stringify(theory)}\n`);
fs.writeFileSync(path.join(outputRoot, "questions.json"), `${JSON.stringify(questions)}\n`);
fs.writeFileSync(path.join(auditRoot, "theory-question-coverage-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
console.log(`학생용 데이터 생성 완료: ${audit.units}개 능력단위, ${audit.elements}개 요소, ${audit.topics}개 필요지식, ${audit.terms}개 용어, ${audit.questions}문항`);
