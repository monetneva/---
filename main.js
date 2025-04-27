// --- Global Variables ---
let contentEN = {};
let contentES = {};
let language = "EN";
let bookTitle = localStorage.getItem('detectedBookTitle') || "Ada Twist, Scientist";
let bookChapter = localStorage.getItem('detectedBookChapter') || "Chapter 2";
let speechMsg = null;
let voices = [];

// Pre-warm speechSynthesis
const warmupMsg = new SpeechSynthesisUtterance('');
speechSynthesis.speak(warmupMsg);
speechSynthesis.cancel();

function showLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'block';
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

// --- DOMContentLoaded Handler ---
document.addEventListener('DOMContentLoaded', function () {
    const savedLang = localStorage.getItem('lang');
    if (savedLang) language = savedLang;

    const storedEN = localStorage.getItem('contentEN');
    const storedES = localStorage.getItem('contentES');

    if (storedEN && storedES) {
        contentEN = JSON.parse(storedEN);
        contentES = JSON.parse(storedES);
        updateHeaderBookInfo();
        populateVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoices;
        }
    }

    const savedAvatar = localStorage.getItem('savedAvatar');
    if (savedAvatar) {
        const avatarDiv = document.getElementById('avatarPreview');
        if (avatarDiv) {
            avatarDiv.innerHTML = `<img src="${savedAvatar}" width="50" height="50" style="border-radius:8px; border:2px solid #E50914;" />`;
        }
    }

    hideLoadingOverlay();
    setupButtonListeners();
    setupImageUpload();
});

// --- Fetch AI Content ---
async function fetchContent() {
    const response = await fetch('/generate_content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: bookTitle, chapter: bookChapter })
    });

    const data = await response.json();
    if (data.content_en && data.content_es) {
        contentEN = parseContent(data.content_en, "EN");
        contentES = parseContent(data.content_es, "ES");
        localStorage.setItem('contentEN', JSON.stringify(contentEN));
        localStorage.setItem('contentES', JSON.stringify(contentES));
    }
}

// --- Update Header Info ---
function updateHeaderBookInfo() {
    const titleElement = document.getElementById('bookInfo');
    if (titleElement) {
        if (bookTitle && bookChapter) {
            titleElement.innerText = `${bookTitle} — ${bookChapter}`;
        } else {
            titleElement.innerText = "Book Info Not Available";
        }
    }
}

function updateHeaderBookInfoLive() {
    const titleElement = document.getElementById('bookInfo');
    const storedTitle = localStorage.getItem('detectedBookTitle') || "No Title";
    const storedChapter = localStorage.getItem('detectedBookChapter') || "";

    if (titleElement) {
        if (storedTitle && storedChapter) {
            titleElement.innerText = `${storedTitle} — ${storedChapter}`;
        } else {
            titleElement.innerText = "Book Info Not Available";
        }
    }
}

// --- Parse Content ---
function parseContent(rawText, lang = "EN") {
    let sections = { about: "", fun_facts: [], vocab: [], discussion: [], similar_titles: [] };
    rawText = rawText.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n").trim();

    const headings = lang === "EN" ? {
        about: "ABOUT", fun_facts: "FUN FACTS", vocab: "VOCAB", discussion: "DISCUSSION", similar_titles: "SIMILAR TITLES"
    } : {
        about: "ACERCA DE", fun_facts: "DATOS DIVERTIDOS", vocab: "VOCABULARIO", discussion: "DISCUSIÓN", similar_titles: "TÍTULOS SIMILARES"
    };

    const aboutMatch = rawText.split(new RegExp(`${headings.about}:`, 'i'))[1]?.split(new RegExp(`${headings.fun_facts}:`, 'i'))[0];
    const funFactsMatch = rawText.split(new RegExp(`${headings.fun_facts}:`, 'i'))[1]?.split(new RegExp(`${headings.vocab}:`, 'i'))[0];
    const vocabMatch = rawText.split(new RegExp(`${headings.vocab}:`, 'i'))[1]?.split(new RegExp(`${headings.discussion}:`, 'i'))[0];
    const discussionMatch = rawText.split(new RegExp(`${headings.discussion}:`, 'i'))[1]?.split(new RegExp(`${headings.similar_titles}:`, 'i'))[0];
    const similarTitlesMatch = rawText.split(new RegExp(`${headings.similar_titles}:`, 'i'))[1];

    if (aboutMatch) sections.about = aboutMatch.trim();
    if (funFactsMatch) sections.fun_facts = funFactsMatch.trim().split(/\n[-•]?\s*/).filter(x => x.trim());
    if (vocabMatch) sections.vocab = vocabMatch.trim().split(/\n[-•]?\s*/).filter(x => x.trim());
    if (discussionMatch) sections.discussion = discussionMatch.trim().split(/\n\d+\.\s*/).filter(x => x.trim());
    if (similarTitlesMatch) sections.similar_titles = similarTitlesMatch.trim().split(/\n\d+\.\s*/).filter(x => x.trim());

    return sections;
}

// --- Setup Image Upload ---
function setupImageUpload() {
    const imageForm = document.getElementById('imageForm');
    const extractedTextDiv = document.getElementById('extractedText');

    if (!imageForm || !extractedTextDiv) return;

    imageForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const fileInput = document.getElementById('imageInput');
        const file = fileInput?.files?.[0];
        if (!file) {
            alert('Please upload an image.');
            return;
        }

        extractedTextDiv.innerHTML = "⏳ Extracting text from image...";
        showLoadingOverlay();

        try {
            const result = await Tesseract.recognize(file, 'eng', { logger: m => console.log(m) });
            const extractedText = result.data.text.trim();
            console.log('Extracted Text:', extractedText);

            const lines = extractedText.split('\n').map(line => line.trim()).filter(line => line);
            const newBookTitle = lines[0] || "Unknown Book";
            const newBookChapter = lines[1] || "Chapter 1";

            localStorage.setItem('detectedBookTitle', newBookTitle);
            localStorage.setItem('detectedBookChapter', newBookChapter);

            extractedTextDiv.innerHTML = "⏳ Generating educational content...";

            await fetchContent();

            contentEN = JSON.parse(localStorage.getItem('contentEN') || '{}');
            contentES = JSON.parse(localStorage.getItem('contentES') || '{}');

            updateHeaderBookInfoLive();

            extractedTextDiv.innerHTML = "";
            hideLoadingOverlay();
        } catch (error) {
            console.error('OCR Error:', error);
            extractedTextDiv.innerHTML = "❌ Failed to extract text. Please try another image.";
            hideLoadingOverlay();
        }
    });
}
