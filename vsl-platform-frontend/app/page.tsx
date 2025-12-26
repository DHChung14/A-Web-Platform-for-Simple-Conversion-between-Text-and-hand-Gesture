"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="landing-container">
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .landing-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
          background: linear-gradient(
            135deg,
            #0a0a0a 0%,
            #1a1a1a 50%,
            #0a0a0a 100%
          );
          font-family: "Courier New", "Fira Code", monospace;
          color: #ffffff;
        }

        /* Animated background - binary code effect */
        .landing-container::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: repeating-linear-gradient(
            0deg,
            rgba(0, 255, 65, 0.03) 0px,
            rgba(0, 255, 65, 0.03) 1px,
            transparent 1px,
            transparent 2px
          );
          pointer-events: none;
          animation: scanlines 8s linear infinite;
          z-index: 1;
        }

        @keyframes scanlines {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(10px);
          }
        }

        .container {
          position: relative;
          z-index: 2;
          text-align: center;
          width: 90%;
          max-width: 600px;
        }

        /* Main button styling */
        .start-button {
          font-size: 4rem;
          font-weight: bold;
          color: #00ff41;
          text-shadow: 0 0 10px #00ff41, 0 0 20px #00ff41, 0 0 30px #00ff41;
          cursor: pointer;
          transition: all 0.3s ease;
          letter-spacing: 0.1em;
          animation: pulse 2s ease-in-out infinite;
          display: inline-block;
          padding: 2rem;
          border: 2px solid transparent;
          border-radius: 8px;
          background: transparent;
          font-family: "Courier New", monospace;
        }

        @keyframes pulse {
          0%,
          100% {
            text-shadow: 0 0 10px #00ff41, 0 0 20px #00ff41, 0 0 30px #00ff41;
            transform: scale(1);
          }
          50% {
            text-shadow: 0 0 20px #00ff41, 0 0 40px #00ff41, 0 0 60px #00ff41;
            transform: scale(1.05);
          }
        }

        .start-button:hover {
          background: #00ff41;
          color: #0a0a0a;
          text-shadow: none;
          border-color: #00ff41;
          animation: none;
          transform: scale(1.1);
          box-shadow: 0 0 30px #00ff41, inset 0 0 30px rgba(0, 255, 65, 0.3);
        }

        /* Glitch effect on text */
        .glitch {
          position: relative;
          margin-top: 2rem;
          margin-bottom: 2rem;
        }

        .glitch::before,
        .glitch::after {
          content: attr(data-text);
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
        }

        .glitch::before {
          animation: glitch-anim-1 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)
            infinite;
          color: #ff00ff;
          z-index: -1;
        }

        .glitch::after {
          animation: glitch-anim-2 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)
            reverse infinite;
          color: #00ffff;
          z-index: -2;
        }

        @keyframes glitch-anim-1 {
          0% {
            clip-path: polygon(0 2%, 100% 2%, 100% 5%, 0 5%);
            transform: translate(0);
          }
          20% {
            clip-path: polygon(0 60%, 100% 60%, 100% 65%, 0 65%);
            transform: translate(-2px, 2px);
          }
          40% {
            clip-path: polygon(0 30%, 100% 30%, 100% 33%, 0 33%);
            transform: translate(-2px, -2px);
          }
          60% {
            clip-path: polygon(0 8%, 100% 8%, 100% 12%, 0 12%);
            transform: translate(2px, 2px);
          }
          80% {
            clip-path: polygon(0 45%, 100% 45%, 100% 48%, 0 48%);
            transform: translate(2px, -2px);
          }
          100% {
            clip-path: polygon(0 12%, 100% 12%, 100% 16%, 0 16%);
            transform: translate(0);
          }
        }

        @keyframes glitch-anim-2 {
          0% {
            clip-path: polygon(0 78%, 100% 78%, 100% 100%, 0 100%);
            transform: translate(0);
          }
          20% {
            clip-path: polygon(0 11%, 100% 11%, 100% 30%, 0 30%);
            transform: translate(2px, -2px);
          }
          40% {
            clip-path: polygon(0 69%, 100% 69%, 100% 89%, 0 89%);
            transform: translate(-2px, 2px);
          }
          60% {
            clip-path: polygon(0 50%, 100% 50%, 100% 70%, 0 70%);
            transform: translate(-2px, -2px);
          }
          80% {
            clip-path: polygon(0 5%, 100% 5%, 100% 20%, 0 20%);
            transform: translate(2px, 2px);
          }
          100% {
            clip-path: polygon(0 75%, 100% 75%, 100% 100%, 0 100%);
            transform: translate(0);
          }
        }

        @media (max-width: 768px) {
          .start-button {
            font-size: 2.5rem;
            padding: 1.5rem;
          }

          .container {
            width: 95%;
          }
        }
      `}</style>

      <div className="container">
        <div className="glitch" data-text="BẮT ĐẦU">
          <button
            className="start-button"
            onClick={() => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/page.tsx:start-button',message:'Bắt đầu button clicked',data:{targetPath:'/login',timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion agent log
              router.push("/login");
            }}
          >
            BẮT ĐẦU
          </button>
        </div>
      </div>
    </div>
  );
}
