const $ = (id) => document.getElementById(id);
const dom = {
  apiBase: $("apiBase"), inputText: $("inputText"), num: $("num"),
  difficulty: $("difficulty"), language: $("language"),
  includeAnswers: $("includeAnswers"),
  btnGen: $("btnGen"), btnCopy: $("btnCopy"), btnDownload: $("btnDownload"),
  status: $("status"), result: $("result")
};

function setStatus(msg, kind = "") {
  dom.status.className = `status ${kind}`;
  dom.status.textContent = msg || "";
}
const getTypes = () => [...document.querySelectorAll(".type:checked")].map(x => x.value);
const sanitizeBase = (u) => (u || "").replace(/\/+$/,"");

function render(questions) {
  dom.result.innerHTML = "";
  if (!Array.isArray(questions) || questions.length === 0) {
    dom.result.innerHTML = `<div class="qcard">没有生成任何题目。</div>`;
    dom.btnCopy.disabled = true; dom.btnDownload.disabled = true;
    return;
  }
  const frag = document.createDocumentFragment();
  questions.forEach((q, i) => {
    const card = document.createElement("div"); card.className = "qcard";
    const h3 = document.createElement("h3"); h3.textContent = `Q${i+1} (${q.type||"mcq"})`;
    const p = document.createElement("p"); p.textContent = q.q || q.question || "(无题干)";
    card.appendChild(h3); card.appendChild(p);

    const choices = q.choices || q.options;
    if (Array.isArray(choices)) {
      const ul = document.createElement("ul"); ul.className = "choices";
      choices.forEach((c,j) => {
        const li = document.createElement("li"); li.className="choice";
        li.textContent = `${String.fromCharCode(65+j)}. ${c}`; ul.appendChild(li);
      }); card.appendChild(ul);
    }
    if (q.answer !== undefined && q.answer !== null) {
      const a = document.createElement("div"); a.className = "answer";
      a.textContent = `Answer: ${q.answer}`; card.appendChild(a);
    }
    if (q.explanation) {
      const ex = document.createElement("div"); ex.innerHTML = `<em>${q.explanation}</em>`;
      card.appendChild(ex);
    }
    frag.appendChild(card);
  });
  dom.result.appendChild(frag);
  dom.btnCopy.disabled = false; dom.btnDownload.disabled = false;
}

async function generate() {
  const base = sanitizeBase(dom.apiBase.value);
  const text = dom.inputText.value.trim();
  if (!base) return setStatus("请填写后端地址。","err");
  if (!text) return setStatus("请粘贴要生成题目的文本。","err");
  const payload = {
    text,
    num_questions: Number(dom.num.value || 5),
    difficulty: dom.difficulty.value,
    types: getTypes().length ? getTypes() : ["mcq"],
    include_answers: dom.includeAnswers.checked,
    language: dom.language.value
  };
  setStatus("生成中…"); dom.btnGen.disabled = true; dom.result.innerHTML = "";
  try {
    const res = await fetch(`${base}/generate_quiz`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    render(Array.isArray(data) ? data : data.questions);
    setStatus("生成成功 ✓","ok");
  } catch (e) {
    console.error(e);
    setStatus(`失败：${e.message}（检查后端是否已启动、地址是否正确、CORS 是否放行）`,"err");
  } finally {
    dom.btnGen.disabled = false;
  }
}

dom.btnGen.addEventListener("click", generate);

dom.btnCopy.addEventListener("click", async () => {
  const txt = [...dom.result.querySelectorAll(".qcard")].map(card => card.innerText).join("\n\n");
  try { await navigator.clipboard.writeText(txt); setStatus("已复制到剪贴板 ✓","ok"); }
  catch { setStatus("复制失败","err"); }
});

dom.btnDownload.addEventListener("click", () => {
  const base = sanitizeBase(dom.apiBase.value);
  const text = dom.inputText.value.trim();
  const qcards = dom.result.querySelectorAll(".qcard");
  if (!qcards.length) return setStatus("没有内容可下载","err");
  // 让用户下载后端原始 JSON（再次请求，确保结构一致）
  const payload = {
    text, num_questions:Number(dom.num.value||5),
    difficulty:dom.difficulty.value, types:getTypes().length?getTypes():["mcq"],
    include_answers:dom.includeAnswers.checked, language:dom.language.value
  };
  fetch(`${base}/generate_quiz`, {
    method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload)
  }).then(r=>r.json()).then(data=>{
    const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "quiz.json"; a.click();
    URL.revokeObjectURL(a.href);
  }).catch(()=>setStatus("下载失败","err"));
});
