from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

old_mount = """    const pendingJobs = loadPendingJobs();
    if (pendingJobs.length > 0) {
      const chatJob = pendingJobs.find((j) => j.type === 'chat' || j.type === 'start-chat');
      if (chatJob) {
        setActiveChatJobId(chatJob.id);
        setIsGenerating(true);
      }
      const imitateJob = pendingJobs.find((j) => j.type === 'imitate');
      if (imitateJob) {
        setActiveImitateJobId(imitateJob.id);
        setIsImitating(true);
      }
      const photoJob = pendingJobs.find((j) => j.type === 'photo');
      if (photoJob) {
        setActivePhotoJobId(photoJob.id);
        setIsPhotoJobRunning(true);
        setIsGenerating(true);
      }
    }
"""
new_mount = """    // Restore only jobs that belong to the chat currently being shown.
    // Jobs from other chats stay persisted and can be resumed when that chat is opened.
    const pendingJobs = loadPendingJobs().filter((job) => job.chatId === activeChatId);
    if (pendingJobs.length > 0) {
      const chatJob = pendingJobs.find((j) => j.type === 'chat' || j.type === 'start-chat');
      if (chatJob) setActiveChatJobId(chatJob.id);

      const imitateJob = pendingJobs.find((j) => j.type === 'imitate');
      if (imitateJob) setActiveImitateJobId(imitateJob.id);

      const photoJob = pendingJobs.find((j) => j.type === 'photo');
      if (photoJob) setActivePhotoJobId(photoJob.id);

      setIsImitating(Boolean(imitateJob));
      setIsPhotoJobRunning(Boolean(photoJob));
      setIsGenerating(Boolean(chatJob || photoJob));
    }
"""
if old_mount not in text:
    raise SystemExit('mount pending-jobs block not found')
text = text.replace(old_mount, new_mount, 1)

marker = """  const handleOpenChat = (chatId: string) => {
"""
helper = """  const restorePendingStateForChat = (chatId: string) => {
    const pendingJobs = loadPendingJobs().filter((job) => job.chatId === chatId);
    const chatJob = pendingJobs.find((job) => job.type === 'chat' || job.type === 'start-chat');
    const imitateJob = pendingJobs.find((job) => job.type === 'imitate');
    const photoJob = pendingJobs.find((job) => job.type === 'photo');

    setActiveChatJobId(chatJob?.id ?? null);
    setActiveImitateJobId(imitateJob?.id ?? null);
    setActivePhotoJobId(photoJob?.id ?? null);
    setIsImitating(Boolean(imitateJob));
    setIsPhotoJobRunning(Boolean(photoJob));
    setIsGenerating(Boolean(chatJob || photoJob));
  };

"""
if helper not in text:
    if marker not in text:
        raise SystemExit('handleOpenChat marker not found')
    text = text.replace(marker, helper + marker, 1)

old_open = """  const handleOpenChat = (chatId: string) => {
    const targetChat = chats.find((c) => c.id === chatId);
    if (targetChat) {
      setActiveCharacterId(targetChat.characterId);
      setActiveChatId(targetChat.id);
      setCurrentView('chat');
    }
  };
"""
new_open = """  const handleOpenChat = (chatId: string) => {
    const targetChat = chats.find((c) => c.id === chatId);
    if (targetChat) {
      restorePendingStateForChat(targetChat.id);
      setActiveCharacterId(targetChat.characterId);
      setActiveChatId(targetChat.id);
      setCurrentView('chat');
    }
  };
"""
if old_open not in text:
    raise SystemExit('handleOpenChat block not found')
text = text.replace(old_open, new_open, 1)

old_select = """    if (existing.length > 0) {
      setActiveChatId(existing[0].id);
      setCurrentView('chat');
    } else {
"""
new_select = """    if (existing.length > 0) {
      handleOpenChat(existing[0].id);
    } else {
"""
if old_select not in text:
    raise SystemExit('handleSelectCharacterToChat block not found')
text = text.replace(old_select, new_select, 1)

old_after_create = """    setChats((prev) => [...prev, newChat]);
    setActiveCharacterId(char.id);
    setActiveChatId(newChatId);
    setCurrentView('chat');

    if (!firstGreeting) {
      setIsGenerating(true);
"""
new_after_create = """    setChats((prev) => [...prev, newChat]);

    // A job from the previously open chat must never make a fresh chat appear to be
    // generating. Keep other-chat jobs persisted, but detach their UI state here.
    setActiveChatJobId(null);
    setActiveImitateJobId(null);
    setActivePhotoJobId(null);
    setIsGenerating(false);
    setIsImitating(false);
    setIsPhotoJobRunning(false);

    setActiveCharacterId(char.id);
    setActiveChatId(newChatId);
    setCurrentView('chat');

    if (!firstGreeting) {
      setIsGenerating(true);
"""
if old_after_create not in text:
    raise SystemExit('new-chat state block not found')
text = text.replace(old_after_create, new_after_create, 1)

path.write_text(text)
print('Chat job state is now scoped to the opened chat')
