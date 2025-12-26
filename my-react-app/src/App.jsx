import React, { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";

import constants, { buildPresenceChecklist } from "../constants";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function App() {
  const [isAIReady, setIsAIReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [presenceChecklist, setPresenceChecklist] = useState([]);

  /* -------------------- CHECK AI AVAILABILITY -------------------- */
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.puter?.ai?.chat) {
        setIsAIReady(true);
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  /* -------------------- PDF TEXT EXTRACTION -------------------- */
  const extractPDFText = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

      const pages = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, i) => {
          const page = await pdf.getPage(i + 1);
          const content = await page.getTextContent();
          return content.items.map((item) => item.str).join(" ");
        })
      );

      return pages.join("\n").trim();
    } catch (err) {
      console.error("PDF extraction failed:", err);
      return "";
    }
  };

  /* -------------------- AI RESPONSE PARSER -------------------- */
  const parseAIResponse = (reply) => {
    try {
      const match = reply.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Invalid AI response");

      return JSON.parse(match[0]);
    } catch (err) {
      throw new Error("Failed to parse AI response");
    }
  };

  /* -------------------- ANALYZE RESUME -------------------- */
  const analyzeResume = async (text) => {
    const prompt = constants.ANALYZE_RESUME_PROMPT.replace(
      "{{DOCUMENT_TEXT}}",
      text
    );

    const response = await window.puter.ai.chat(
      [
        { role: "system", content: "You are an expert resume reviewer." },
        { role: "user", content: prompt },
      ],
      { model: "gpt-4o" }
    );

    const content =
      typeof response === "string"
        ? response
        : response.message?.content || "";

    const result = parseAIResponse(content);

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  };

  /* -------------------- FILE UPLOAD HANDLER -------------------- */
  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];

    if (!uploadedFile || uploadedFile.type !== "application/pdf") {
      alert("Please upload a valid PDF file");
      return;
    }

    setFile(uploadedFile);
    setIsLoading(true);
    setAnalysis(null);
    setResumeText("");
    setPresenceChecklist([]);

    try {
      const text = await extractPDFText(uploadedFile);
      setResumeText(text);
      setPresenceChecklist(buildPresenceChecklist(text));

      const aiResult = await analyzeResume(text);
      setAnalysis(aiResult);
    } catch (err) {
      alert(err.message);
      reset();
    } finally {
      setIsLoading(false);
    }
  };

  /* -------------------- RESET -------------------- */
  const reset = () => {
    setFile(null);
    setAnalysis(null);
    setResumeText("");
    setPresenceChecklist([]);
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="min-h-screen bg-main-gradient p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="max-w-5xl w-full mx-auto">

        {/* HEADER */}
        <div className="text-center mb-6">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light bg-gradient-to-r from-cyan-300 via-teal-200 to-sky-300 bg-clip-text text-transparent mb-2">
            Hopen the Poonny
          </h1>
          <p className="text-slate-300">
            Upload your resume and get instant AI feedback
          </p>
        </div>

        {/* UPLOAD */}
        {!file && !isLoading && (
          <div className="upload-area">
            <div className="upload-zone text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-2xl text-slate-200 mb-2">
                Upload Your Resume
              </h3>
              <p className="text-slate-400 mb-6">
                PDF files only • Instant analysis
              </p>

              <input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={!isAIReady}
                className="hidden"
              />

              <label
                htmlFor="file-upload"
                className={`btn-primary inline-block ${!isAIReady ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                Choose PDF File
              </label>
            </div>
          </div>
        )}

        {/* LOADING */}
        {isLoading && (
          <div className="text-center p-8">
            <div className="loading-spinner mb-4"></div>
            <h3 className="text-xl text-slate-200 mb-2">
              Analyzing Your Resume
            </h3>
            <p className="text-slate-400">
              Please wait while AI reviews your resume 😊
            </p>
          </div>
        )}

        {/* RESULT */}
        {analysis && file && (
          <div className="space-y-6 p-6">
            <div className="file-info-card">
              <div className="flex items-center gap-4">
                <span className="text-3xl">📄</span>
                <div>
                  <h3 className="text-xl font-bold text-green-500">
                    Analysis Complete
                  </h3>
                  <p className="text-slate-300 break-all">
                    {file.name}
                  </p>
                </div>
              </div>
            </div>
            <button onClick={reset} className="btn-secondary">
              🔃 New Analysis
            </button>
            <div className="score-card">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-2xl">🏆</span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">Overall Score</h2>

                </div>
                <div className="relative">
                  <p className="text-6xl sm:text-8xl font-extrabold text-cyan-400 drop-show-lg">{analysis.overallScore || "7"}</p>
                </div>
                <div className={`inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full ${parseInt(analysis.overallScore) >= 8 ? "score-status-excellentt" : parseInt(analysis.overallScore) >= 6 ? "score-status-good" : "score-status-improvement "
                  }`}>
                  <span className="text-lg">
                    {parseInt(analysis.overallScore) >= 8 ? "🌟" : parseInt(analysis.overallScore) >= 6 ? "⭐" : "📈"}
                  </span>
                  <span className="font-semibold text-lg">
                    {parseInt(analysis.overallScore) >= 8 ? "Excellent" : parseInt(analysis.overallScore) >= 6 ? "Good" : "Improvement Needed"}
                  </span>

                </div>
                <div></div>

              </div>
            </div>
          </div>


        )}
      </div>
    </div>
  );
}

export default App;
