import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import Editor from "@monaco-editor/react";

function App() {
  // State Management
  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [code, setCode] = useState("// Start coding here...");
  const [language, setLanguage] = useState("javascript");
  const [hostId, setHostId] = useState(null);
  const [output, setOutput] = useState("");
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");

  const chatEndRef = useRef(null);
  const aiEndRef = useRef(null);
  const codeRef = useRef(code);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Room Management
  const joinRoom = () => {
    if (room.trim() !== "" && username.trim() !== "") {
      const newSocket = io("http://localhost:5001");
      setSocket(newSocket);
      newSocket.emit("join_room", { room, username });
      setJoined(true);
    }
  };

  const leaveRoom = () => {
    socket?.disconnect();
    setSocket(null);
    setJoined(false);
    setRoom("");
    setUsername("");
    setUsers([]);
    setMessages([]);
    setVersions([]);
    setCode("// Start coding here...");
    setOutput("");
    setHostId(null);
  };

  // Socket Listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("room_data", (data) => {
      setUsers(data.users);
      setHostId(data.host);
      setLanguage(data.language);
    });

    socket.on("language_updated", (newLang) => {
      setLanguage(newLang);
    });

    socket.on("receive_code", (data) => setCode(data));
    socket.on("receive_message", (data) =>
      setMessages((prev) => [...prev, data])
    );
    socket.on("update_versions", (data) => setVersions(data));
    socket.on("receive_output", (data) => {
      console.log("Received Output:", data);
      setOutput(`⚡ Executed by ${data.ranBy}\n\n${data.output}`);
    });

    return () => {
      socket.off("room_data");
      socket.off("language_updated");
      socket.off("receive_code");
      socket.off("receive_message");
      socket.off("update_versions");
      socket.off("receive_output");
    };
  }, [socket]);

  // Auto Save
  useEffect(() => {
    if (!socket || !joined) return;

    const interval = setInterval(() => {
      socket.emit("save_version", {
        room,
        code: codeRef.current,
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [socket, joined]);

  // Auto Scroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto Scroll AI Chat
  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // Core Functions
  const handleEditorChange = (value) => {
    const newCode = value || "";
    setCode(newCode);
    socket?.emit("send_code", { room, code: newCode });
  };

  const sendMessage = () => {
    if (message.trim() !== "") {
      socket?.emit("send_message", { room, message });
      setMessage("");
    }
  };

  const restoreVersion = (savedCode) => {
    setCode(savedCode);
    socket?.emit("send_code", { room, code: savedCode });
  };

  const runCode = async () => {
    try {
      setOutput("Running...");
      await fetch("http://localhost:5001/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, room, username }),
      });
    } catch (err) {
      setOutput("Error running code");
    }
  };

  // AI Functions
  const getAISuggestion = async (prompt) => {
    try {
      const userMsg = { sender: "You", message: prompt, time: new Date().toLocaleTimeString() };
      setAiMessages((prev) => [...prev, userMsg]);
      setAiInput("");

      const response = await fetch("http://localhost:5001/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code, 
          language,
          prompt 
        }),
      });

      let data;
      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        // Handle error responses
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
          throw new Error(data.suggestion || data.error || `Server error: ${response.status}`);
        } else {
          const text = await response.text();
          throw new Error(`Server error: ${response.status} - ${text.substring(0, 100)}`);
        }
      }
      
      data = await response.json();
      const aiMsg = { 
        sender: "AI Assistant", 
        message: data.suggestion,
        time: new Date().toLocaleTimeString() 
      };
      
      setAiMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI Error:", err);
      setAiMessages((prev) => [...prev, {
        sender: "AI Assistant",
        message: err.message || "Sorry, I couldn't process that request. Make sure Ollama is running.",
        time: new Date().toLocaleTimeString()
      }]);
    }
  };

  // Download Code
  const downloadCode = () => {
    const element = document.createElement("a");
    const extensions = { javascript: "js", python: "py", cpp: "cpp" };
    const ext = extensions[language] || language;
    const filename = `code.${ext}`;
    
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(code));
    element.setAttribute("download", filename);
    element.style.display = "none";
    
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const isHost = socket?.id === hostId;

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      backgroundColor: "#0f0f15", 
      color: "white",
      backgroundImage: "linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))"
    }}>
      
      {/* HEADER */}
      <div className="header" style={{ 
        padding: "16px 24px", 
        borderBottom: "1px solid rgba(99, 102, 241, 0.1)", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        backdropFilter: "blur(10px)",
        background: "rgba(15, 15, 21, 0.8)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "28px" }}>💻</div>
          <h2 style={{ 
            margin: 0, 
            fontSize: "24px",
            fontWeight: "700",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Code Collaborate
          </h2>
        </div>

        {joined && (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ 
              fontSize: "12px", 
              color: "#93c5fd",
              fontWeight: "500",
              padding: "4px 12px",
              background: "rgba(99, 102, 241, 0.15)",
              borderRadius: "20px"
            }}>
              Room: {room}
            </span>

            <button
              onClick={downloadCode}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #f59e0b, #f97316)",
                color: "white",
                fontWeight: "600",
                fontSize: "13px",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 16px rgba(245, 158, 11, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              ⬇️ Download
            </button>

            <button
              onClick={runCode}
              className="btn-success"
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                color: "white",
                fontWeight: "600",
                fontSize: "13px",
                background: "linear-gradient(135deg, #10b981, #059669)"
              }}
            >
              ▶ Run Code
            </button>
            <button
              onClick={leaveRoom}
              className="btn-danger"
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "13px",
                background: "linear-gradient(135deg, #ef4444, #dc2626)"
              }}
            >
              Leave
            </button>
          </div>
        )}
      </div>

      {!joined ? (
        <div 
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "linear-gradient(135deg, #1a1a3e 0%, #0f0f15 50%, #1a0f3e 100%)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            background: "radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)",
            pointerEvents: "none"
          }}></div>

          <div className="login-container"
            style={{
              width: "420px",
              padding: "48px",
              borderRadius: "16px",
              background: "rgba(15, 15, 21, 0.7)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              zIndex: 1,
              position: "relative"
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <h2 
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "32px",
                  fontWeight: "700",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}>
                Join Room 🚀
              </h2>
              <p style={{
                margin: "0",
                fontSize: "14px",
                color: "#93c5fd"
              }}>
                Start collaborating in real-time
              </p>
            </div>

            <input
              type="text"
              placeholder="Enter Your Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                outline: "none",
                background: "rgba(26, 26, 46, 0.8)",
                color: "white",
                fontSize: "14px",
                transition: "all 0.3s ease",
                backdropFilter: "blur(10px)"
              }}
              onFocus={(e) => e.target.style.borderColor = "rgba(99, 102, 241, 0.6)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(99, 102, 241, 0.2)"}
            />

            <input
              type="text"
              placeholder="Enter Room ID"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                outline: "none",
                background: "rgba(26, 26, 46, 0.8)",
                color: "white",
                fontSize: "14px",
                transition: "all 0.3s ease",
                backdropFilter: "blur(10px)"
              }}
              onFocus={(e) => e.target.style.borderColor = "rgba(99, 102, 241, 0.6)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(99, 102, 241, 0.2)"}
            />

            <button
              onClick={joinRoom}
              className="btn-primary"
              style={{
                padding: "12px 24px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white",
                fontWeight: "700",
                fontSize: "15px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                marginTop: "8px"
              }}
            >
              🔗 Join Room
            </button>

            <div style={{ textAlign: "center", fontSize: "12px", color: "#666" }}>
              💡 Pro tip: Share the same Room ID to collaborate
            </div>
          </div>
        </div>
      ) : (
        <div className="editor-container" style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 380px", gap: "1px", backgroundColor: "#1a1a2e" }}>
          
          {/* EDITOR + OUTPUT */}
          <div style={{ display: "flex", flexDirection: "column", backgroundColor: "#0f0f15" }}>
            <Editor
              height="70%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={handleEditorChange}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                wordWrap: "on",
                automaticLayout: true,
                fontFamily: "'Fira Code', 'Courier New', monospace",
                lineHeight: 1.6,
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false
              }}
            />

            <div style={{ 
              height: "30%", 
              background: "#0a0a12", 
              padding: "16px", 
              borderTop: "1px solid rgba(99, 102, 241, 0.1)",
              overflowY: "auto",
              fontFamily: "'Fira Code', monospace",
              fontSize: "13px",
              lineHeight: "1.5"
            }}>
              <div style={{ fontWeight: "700", marginBottom: "10px", color: "#93c5fd" }}>
                ⚙️ Output
              </div>
              <pre style={{ 
                whiteSpace: "pre-wrap",
                margin: "0",
                color: output.includes("Error") ? "#fca5a5" : "#86efac"
              }}>{output}</pre>
            </div>
          </div>

          {/* SIDEBAR */}
          <div style={{ 
            background: "linear-gradient(180deg, rgba(26, 26, 46, 0.8) 0%, rgba(15, 15, 21, 0.9) 100%)",
            padding: "20px", 
            borderLeft: "1px solid rgba(99, 102, 241, 0.1)", 
            display: "flex", 
            flexDirection: "column",
            backdropFilter: "blur(10px)",
            overflowY: "auto"
          }}>
            
            {/* USERS SECTION */}
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ 
                margin: "0 0 12px 0", 
                fontSize: "14px", 
                fontWeight: "700",
                color: "#93c5fd",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                👥 Online ({users.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {users.map((user, idx) => (
                  <div 
                    key={user.id}
                    className="user-item"
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "rgba(99, 102, 241, 0.1)",
                      transition: "all 0.3s ease",
                      border: "1px solid rgba(99, 102, 241, 0.2)",
                      animationDelay: `${idx * 0.1}s`,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    <span className="online-indicator"></span>
                    <span style={{ fontWeight: "500", flex: 1 }}>{user.username}</span>
                    {user.id === hostId && (
                      <span style={{ 
                        background: "rgba(255, 215, 0, 0.2)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        color: "#fbbf24"
                      }}>
                        👑
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height: "1px", background: "rgba(99, 102, 241, 0.1)", margin: "16px 0" }}></div>

            {/* CHAT SECTION */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "0" }}>
              <h3 style={{ 
                margin: "0 0 12px 0", 
                fontSize: "14px", 
                fontWeight: "700",
                color: "#93c5fd",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                💬 Chat
              </h3>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px", scrollBehavior: "smooth" }}>
                {messages.map((msg, index) => {
                  const isMine = msg.sender === username;
                  const isSystem = msg.sender === "system";

                  if (isSystem) {
                    return (
                      <div 
                        key={index} 
                        className="message-group"
                        style={{ 
                          textAlign: "center", 
                          fontSize: "11px", 
                          color: "#6b7280",
                          padding: "4px 0",
                          fontStyle: "italic"
                        }}
                      >
                        {msg.message}
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={index} 
                      className="message-group"
                      style={{ 
                        display: "flex", 
                        justifyContent: isMine ? "flex-end" : "flex-start",
                        animation: "slideInUp 0.3s ease-out"
                      }}
                    >
                      <div style={{
                        maxWidth: "85%",
                        padding: "10px 12px",
                        borderRadius: isMine ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                        background: isMine ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(42, 42, 62, 0.6)",
                        color: isMine ? "white" : "#e0e7ff",
                        fontSize: "13px",
                        wordWrap: "break-word",
                        border: isMine ? "none" : "1px solid rgba(99, 102, 241, 0.2)",
                        transition: "all 0.3s ease",
                        boxShadow: isMine ? "0 4px 12px rgba(99, 102, 241, 0.2)" : "none"
                      }}>
                        {!isMine && (
                          <div style={{ 
                            fontSize: "11px", 
                            fontWeight: "600", 
                            marginBottom: "3px", 
                            opacity: 0.8,
                            color: "#93c5fd"
                          }}>
                            {msg.sender}
                          </div>
                        )}
                        {msg.message}
                        <div style={{ 
                          fontSize: "10px", 
                          marginTop: "4px", 
                          textAlign: "right", 
                          opacity: 0.6 
                        }}>
                          {msg.time}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef}></div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                <input
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "20px",
                    border: "1px solid rgba(99, 102, 241, 0.2)",
                    background: "rgba(26, 26, 46, 0.6)",
                    color: "white",
                    fontSize: "13px",
                    outline: "none",
                    transition: "all 0.2s ease"
                  }}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  onFocus={(e) => e.target.style.borderColor = "rgba(99, 102, 241, 0.6)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(99, 102, 241, 0.2)"}
                  placeholder="Type message..."
                />
                <button
                  onClick={sendMessage}
                  style={{
                    borderRadius: "50%",
                    width: "38px",
                    height: "38px",
                    padding: "0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    border: "none",
                    color: "white",
                    fontSize: "16px",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "scale(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "scale(1)";
                  }}
                >
                  ✈️
                </button>
              </div>
            </div>

            <div style={{ height: "1px", background: "rgba(99, 102, 241, 0.1)", margin: "16px 0" }}></div>

            {/* LANGUAGE SELECT */}
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ 
                margin: "0 0 10px 0", 
                fontSize: "14px", 
                fontWeight: "700",
                color: "#93c5fd",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>🖥 Language</h3>
              <select
                value={language}
                disabled={!isHost}
                onChange={(e) =>
                  socket?.emit("change_language", {
                    room,
                    language: e.target.value,
                  })
                }
                style={{
                  padding: "10px 12px",
                  width: "100%",
                  background: isHost ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.05)",
                  color: "white",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  borderRadius: "8px",
                  cursor: isHost ? "pointer" : "not-allowed",
                  outline: "none",
                  transition: "all 0.2s ease",
                  opacity: isHost ? "1" : "0.5"
                }}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
              </select>
              {!isHost && (
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "6px" }}>
                  Only host can change
                </div>
              )}
            </div>

            <div style={{ height: "1px", background: "rgba(99, 102, 241, 0.1)", margin: "16px 0" }}></div>

            {/* VERSION HISTORY */}
            <div>
              <div 
                onClick={() => setShowVersions(!showVersions)} 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  cursor: "pointer",
                  padding: "8px 0",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <h3 style={{ 
                  margin: "0", 
                  fontSize: "14px", 
                  fontWeight: "700",
                  color: "#93c5fd",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>💾 History</h3>
                <span style={{ fontSize: "16px", transition: "transform 0.3s ease", transform: showVersions ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
              </div>

              {showVersions && (
                <div style={{ 
                  marginTop: "12px", 
                  maxHeight: "250px", 
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}>
                  {versions.length === 0 ? (
                    <div style={{ fontSize: "12px", color: "#6b7280", textAlign: "center", padding: "10px 0" }}>
                      No versions saved yet
                    </div>
                  ) : (
                    versions.map((v, index) => (
                      <button
                        key={index}
                        onClick={() => restoreVersion(v.code)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "rgba(99, 102, 241, 0.15)",
                          border: "1px solid rgba(99, 102, 241, 0.2)",
                          color: "#e0e7ff",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "12px",
                          transition: "all 0.3s ease",
                          textAlign: "left"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "rgba(99, 102, 241, 0.3)";
                          e.target.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "rgba(99, 102, 241, 0.15)";
                          e.target.style.transform = "translateY(0)";
                        }}
                      >
                        ↩️ {v.time}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI CHATBOT PANEL */}
      {showAI && (
        <div style={{ 
          position: "fixed",
          bottom: "0",
          right: "0",
          width: "400px",
          height: "500px",
          background: "linear-gradient(180deg, rgba(26, 26, 46, 0.95) 0%, rgba(15, 15, 21, 0.95) 100%)",
          borderTop: "2px solid rgba(99, 102, 241, 0.3)",
          borderLeft: "2px solid rgba(99, 102, 241, 0.3)",
          display: "flex",
          flexDirection: "column",
          backdropFilter: "blur(10px)",
          zIndex: 100,
          boxShadow: "0 -20px 60px rgba(0, 0, 0, 0.5)"
        }}>
          <div style={{
            padding: "16px",
            borderBottom: "1px solid rgba(99, 102, 241, 0.2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <h3 style={{
              margin: "0",
              fontSize: "16px",
              fontWeight: "700",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              🤖 AI Assistant
            </h3>
            <button
              onClick={() => setShowAI(false)}
              style={{
                background: "none",
                border: "none",
                color: "#93c5fd",
                fontSize: "20px",
                cursor: "pointer"
              }}
            >
              ✕
            </button>
          </div>

          {/* AI MESSAGE HISTORY */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            {aiMessages.length === 0 ? (
              <div style={{
                textAlign: "center",
                color: "#6b7280",
                padding: "20px",
                fontSize: "13px"
              }}>
                Ask me to optimize, explain, refactor, or fix your code!
              </div>
            ) : (
              aiMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: msg.sender === "You" ? "flex-end" : "flex-start",
                    animation: "slideInUp 0.3s ease-out"
                  }}
                >
                  <div style={{
                    maxWidth: "85%",
                    padding: "10px 12px",
                    borderRadius: msg.sender === "You" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    background: msg.sender === "You" 
                      ? "linear-gradient(135deg, #6366f1, #8b5cf6)" 
                      : "rgba(99, 102, 241, 0.15)",
                    color: msg.sender === "You" ? "white" : "#e0e7ff",
                    fontSize: "12px",
                    wordWrap: "break-word",
                    border: msg.sender === "You" ? "none" : "1px solid rgba(99, 102, 241, 0.3)",
                    lineHeight: "1.4"
                  }}>
                    {msg.message}
                    <div style={{
                      fontSize: "10px",
                      marginTop: "4px",
                      opacity: 0.6
                    }}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={aiEndRef}></div>
          </div>

          {/* QUICK ACTION BUTTONS */}
          <div style={{
            padding: "12px",
            borderTop: "1px solid rgba(99, 102, 241, 0.2)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
            marginBottom: "8px"
          }}>
            <button
              onClick={() => getAISuggestion("Optimize this code for performance")}
              style={{
                padding: "6px",
                fontSize: "11px",
                background: "rgba(34, 197, 94, 0.2)",
                border: "1px solid rgba(34, 197, 94, 0.4)",
                borderRadius: "6px",
                color: "#86efac",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "rgba(34, 197, 94, 0.3)"}
              onMouseLeave={(e) => e.target.style.background = "rgba(34, 197, 94, 0.2)"}
            >
              ⚡ Optimize
            </button>
            <button
              onClick={() => getAISuggestion("Explain this code")}
              style={{
                padding: "6px",
                fontSize: "11px",
                background: "rgba(59, 130, 246, 0.2)",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                borderRadius: "6px",
                color: "#93c5fd",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "rgba(59, 130, 246, 0.3)"}
              onMouseLeave={(e) => e.target.style.background = "rgba(59, 130, 246, 0.2)"}
            >
              📖 Explain
            </button>
            <button
              onClick={() => getAISuggestion("Refactor this code")}
              style={{
                padding: "6px",
                fontSize: "11px",
                background: "rgba(168, 85, 247, 0.2)",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                borderRadius: "6px",
                color: "#d8b4fe",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "rgba(168, 85, 247, 0.3)"}
              onMouseLeave={(e) => e.target.style.background = "rgba(168, 85, 247, 0.2)"}
            >
              🔄 Refactor
            </button>
            <button
              onClick={() => getAISuggestion("Find and fix bugs")}
              style={{
                padding: "6px",
                fontSize: "11px",
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "6px",
                color: "#fca5a5",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "rgba(239, 68, 68, 0.3)"}
              onMouseLeave={(e) => e.target.style.background = "rgba(239, 68, 68, 0.2)"}
            >
              🐛 Bug Fix
            </button>
          </div>

          {/* AI INPUT */}
          <div style={{
            padding: "12px",
            borderTop: "1px solid rgba(99, 102, 241, 0.2)",
            display: "flex",
            gap: "6px"
          }}>
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && getAISuggestion(aiInput)}
              placeholder="Ask AI..."
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "20px",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                background: "rgba(26, 26, 46, 0.6)",
                color: "white",
                fontSize: "12px",
                outline: "none",
                transition: "all 0.2s ease"
              }}
              onFocus={(e) => e.target.style.borderColor = "rgba(99, 102, 241, 0.6)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(99, 102, 241, 0.2)"}
            />
            <button
              onClick={() => getAISuggestion(aiInput)}
              style={{
                borderRadius: "50%",
                width: "34px",
                height: "34px",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                color: "white",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => e.target.style.transform = "scale(1.1)"}
              onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
            >
              ↩️
            </button>
          </div>
        </div>
      )}

      {/* AI TOGGLE BUTTON */}
      <button
        onClick={() => setShowAI(!showAI)}
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          border: "none",
          color: "white",
          fontSize: "24px",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(99, 102, 241, 0.4)",
          transition: "all 0.3s ease",
          display: joined ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "scale(1.15)";
          e.target.style.boxShadow = "0 12px 32px rgba(99, 102, 241, 0.6)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)";
          e.target.style.boxShadow = "0 8px 24px rgba(99, 102, 241, 0.4)";
        }}
      >
        🤖
      </button>
    </div>
  );
}

export default App;
