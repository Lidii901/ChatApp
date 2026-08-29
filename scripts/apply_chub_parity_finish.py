from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected block not found in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


# Preserve the Imitate Me knowledge boundary: the technical card name is not
# automatically in-world knowledge for the player's character.
replace_once(
    "server.ts",
    "Do not write actions, dialogue, thoughts or decisions for {{char}}. Do not invent prior meetings, relationship history, names, memories, knowledge or familiarity that are not established in the available context.",
    "Do not write actions, dialogue, thoughts or decisions for the other character. Do not invent prior meetings, relationship history, names, memories, knowledge or familiarity that are not established in the available context.",
)

replace_once(
    "src/App.tsx",
    "import { CharacterListView } from './components/CharacterListView';\n",
    "import { CharacterListView } from './components/CharacterListView';\nimport { SettingsHomeView } from './components/SettingsHomeView';\n",
)

replace_once(
    "src/App.tsx",
    """              {activeTab === 'settings' && (\n                <div className=\"h-full overflow-y-auto p-4 space-y-4\">\n                  <div className=\"border-b border-zinc-800 pb-3\">\n                    <h1 className=\"text-lg font-bold text-zinc-100\">Einstellungen & System</h1>\n                    <p className=\"text-xs text-zinc-400\">Verwalte Modell-Parameter, Backups und Diagnose</p>\n                  </div>\n                  <div className=\"space-y-2\">\n                    <button onClick={() => setIsSettingsModalOpen(true)} className=\"w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs text-zinc-200 hover:bg-zinc-900\">\n                      <span className=\"font-semibold\">Modell-Parameter (Temperatur, Tokens, Context)</span><span className=\"text-rose-400\">Öffnen ▾</span>\n                    </button>\n                    <button onClick={() => setIsImportExportModalOpen(true)} className=\"w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs text-zinc-200 hover:bg-zinc-900\">\n                      <span className=\"font-semibold\">Daten-Backup, Export & Import</span><span className=\"text-rose-400\">Öffnen ▾</span>\n                    </button>\n                    <button onClick={() => setIsDiagnosticsModalOpen(true)} className=\"w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs text-zinc-200 hover:bg-zinc-900\">\n                      <span className=\"font-semibold\">Diagnose & API-Logs</span><span className=\"text-rose-400\">Öffnen ▾</span>\n                    </button>\n                  </div>\n                </div>\n              )}""",
    """              {activeTab === 'settings' && (\n                <SettingsHomeView\n                  onOpenGeneration={() => setIsSettingsModalOpen(true)}\n                  onOpenData={() => setIsImportExportModalOpen(true)}\n                  onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}\n                />\n              )}""",
)

replace_once(
    "src/App.tsx",
    """      if (data.jobId) {\n        setActiveChatJobId(data.jobId);\n        addPendingJob({\n          id: data.jobId,\n          type: 'chat',\n          characterId: currentCharId,\n          chatId: currentChatId,\n          createdAt: Date.now(),\n        });\n      }\n    } catch (err: any) {""",
    """      if (data.jobId) {\n        setActiveChatJobId(data.jobId);\n        addPendingJob({\n          id: data.jobId,\n          type: 'chat',\n          characterId: currentCharId,\n          chatId: currentChatId,\n          createdAt: Date.now(),\n        });\n      } else if (data.content) {\n        setIsGenerating(false);\n        const messageRole = (data.role || (activeCharacter.id === 'char-dean' ? 'dean' : 'character')) as 'dean' | 'character';\n        const charMsg: Message = {\n          id: `msg-${Date.now()}`,\n          role: messageRole,\n          content: data.content,\n          timestamp: data.timestamp || Date.now(),\n          speakerName: data.speakerName || activeCharacter.name,\n        };\n        updateCurrentChat((c) => ({ ...c, messages: [...updatedMessages, charMsg], updatedAt: Date.now() }));\n        addLog({\n          type: 'chat',\n          status: 'success',\n          model: data.modelUsed || settings.modelName || 'openrouter',\n          latencyMs: data.latencyMs || Date.now() - startTime,\n          message: `${activeCharacter.name} Antwort generiert (${data.content.length} Zeichen)`,\n        });\n        setTimeout(() => scrollToBottom(), 100);\n      }\n    } catch (err: any) {""",
)

replace_once(
    "src/App.tsx",
    """    setIsImitating(true);\n    setErrorMessage(null);\n    try {""",
    """    setIsImitating(true);\n    setErrorMessage(null);\n    const startTime = Date.now();\n    try {""",
)

replace_once(
    "src/App.tsx",
    """      if (data.jobId) {\n        setActiveImitateJobId(data.jobId);\n        addPendingJob({\n          id: data.jobId,\n          type: 'imitate',\n          characterId: activeCharacter.id,\n          chatId: activeChat.id,\n          createdAt: Date.now(),\n        });\n      }\n    } catch (err: any) {\n      setErrorMessage(err.message || 'Konnte keinen Entwurf generieren.');\n      setIsImitating(false);\n    }""",
    """      if (data.jobId) {\n        setActiveImitateJobId(data.jobId);\n        addPendingJob({\n          id: data.jobId,\n          type: 'imitate',\n          characterId: activeCharacter.id,\n          chatId: activeChat.id,\n          createdAt: Date.now(),\n        });\n      } else if (data.draft) {\n        setIsImitating(false);\n        const draftText = data.draft;\n        setInput((prev) => (prev.trim() ? `${prev}\\n\\n${draftText}` : draftText));\n        addLog({\n          type: 'imitate',\n          status: 'success',\n          model: data.modelUsed || settings.modelName || 'openrouter',\n          latencyMs: data.latencyMs || Date.now() - startTime,\n          message: 'Imitate Me Entwurf generiert',\n        });\n      }\n    } catch (err: any) {\n      const errorMsg = err.message || 'Konnte keinen Entwurf generieren.';\n      setErrorMessage(errorMsg);\n      setIsImitating(false);\n      addLog({\n        type: 'error',\n        status: 'error',\n        model: settings.modelName || 'openrouter',\n        latencyMs: Date.now() - startTime,\n        message: errorMsg,\n      });\n    }""",
)

replace_once(
    "src/App.tsx",
    """          setIsImitating(false);\n          setErrorMessage(job.error || 'Konnte keinen Entwurf generieren.');\n        }\n      } catch (err) {\n        console.warn('Imitate poll error', err);""",
    """          setIsImitating(false);\n          setErrorMessage(job.error || 'Konnte keinen Entwurf generieren.');\n          addLog({\n            type: 'error',\n            status: 'error',\n            model: settings.modelName || 'openrouter',\n            message: job.error || 'Imitate Job fehlgeschlagen',\n          });\n        }\n      } catch (err) {\n        console.warn('Imitate poll error', err);""",
)

replace_once(
    "src/App.tsx",
    "const targetChatId = job.chatId || activeChat.id;",
    "const targetChatId = job.chatId || job.metadata?.chatId || activeChat.id;",
)
replace_once(
    "src/App.tsx",
    """            setChats((prev) => prev.map((c) => c.id === targetChatId\n              ? { ...c, messages: [...c.messages, newMsg], updatedAt: Date.now() }\n              : c));\n          }""",
    """            setChats((prev) => prev.map((c) => c.id === targetChatId\n              ? { ...c, messages: [...c.messages, newMsg], updatedAt: Date.now() }\n              : c));\n            addLog({\n              type: 'photo',\n              status: 'success',\n              model: job.result.modelUsed || 'openrouter',\n              latencyMs: job.result.latencyMs,\n              message: `${charObj.name} hat ein Foto gesendet`,\n            });\n            setTimeout(() => scrollToBottom(), 100);\n          }""",
)

server = Path("server.ts")
server_text = server.read_text()
if server_text.count("timeoutMs: 50000,") >= 3:
    server.write_text(server_text.replace("timeoutMs: 50000,", "timeoutMs: 180000,", 3))
elif server_text.count("timeoutMs: 180000,") < 3:
    raise SystemExit("Expected three chat/start/imitate timeout settings in server.ts")

print("Preview runtime reliability and settings hub patch applied")
