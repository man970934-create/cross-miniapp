const tg = window.Telegram.WebApp;
tg.expand();

const CHAPTERS_COUNT = 7;
const MAX_CHARS_PER_PAGE = 2000;

let currentChapter = 1;
let currentPage = 1;

let totalPages = 1;
let pages = [];

let chapterTexts = {};
let illustrations = {};

const chapterSelect = document.getElementById("chapterSelect");
const pageContent = document.getElementById("pageContent");
const pageIndicator = document.getElementById("pageIndicator");

const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");

async function loadIllustrations(){

    const response = await fetch("illustrations.json");

    illustrations = await response.json();
}

async function loadChapterFromFile(chapter){

    if(chapterTexts[chapter])
    return chapterTexts[chapter];

    const response =
    await fetch(`chapters/chapter${chapter}.txt`);

    const text = await response.text();

    const paragraphs = text
    .split(/\n\s*\n/)
    .map(p=>p.trim())
    .filter(p=>p.length>0);

    chapterTexts[chapter] = paragraphs;

    return paragraphs;
}

function splitIntoPages(paragraphs,max){

    const pages=[];
    let current="";

    for(let para of paragraphs){

        if((current.length+para.length)>max && current.length>0){

            pages.push(current.trim());

            current = para+"\n\n";

        }
        else{

            if(current.length>0)
            current+="\n\n";

            current+=para;
        }

    }

    if(current.trim().length>0)
    pages.push(current.trim());

    return pages;
}

async function loadChapter(chapter){

    const paragraphs =
    await loadChapterFromFile(chapter);

    pages =
    splitIntoPages(paragraphs,MAX_CHARS_PER_PAGE);

    totalPages = pages.length;

    renderPage();
}

function renderPage(){

    const pageText =
    pages[currentPage-1] || "";

    const paragraphs =
    pageText.split("\n\n");

    let html="";

    if(currentPage===1 && illustrations[currentChapter]){

        html+=`
        <img src="images/${illustrations[currentChapter]}"
        style="width:100%;max-width:420px;
        display:block;margin:0 auto 20px auto;">
        `;
    }

    paragraphs.forEach(p=>{

        html+=`<p class="paragraph">${p}</p>`;

    });

    pageContent.innerHTML = html;

    pageIndicator.textContent =
    `${currentPage} / ${totalPages}`;

}

function nextPage(){

    if(currentPage<totalPages){

        currentPage++;

        renderPage();

    }

}

function prevPage(){

    if(currentPage>1){

        currentPage--;

        renderPage();

    }

}

prevBtn.onclick = nextPage;
nextBtn.onclick = prevPage;

chapterSelect.addEventListener("change",async(e)=>{

    currentChapter = parseInt(e.target.value);

    currentPage = 1;

    await loadChapter(currentChapter);

});

function initChapters(){

    for(let i=1;i<=CHAPTERS_COUNT;i++){

        const option =
        document.createElement("option");

        option.value = i;

        option.textContent =
        `Глава ${i}`;

        chapterSelect.appendChild(option);

    }

}

window.addEventListener("beforeunload",()=>{

    tg.sendData(JSON.stringify({

        action:"close_app",

        chapter:currentChapter,

        page:currentPage

    }));

});

(async function(){

    initChapters();

    await loadIllustrations();

    await loadChapter(currentChapter);

})();
