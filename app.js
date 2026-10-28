/**
 * MiniGit OOP - Dynamic Simulator & Visualizer
 * Fully faithful implementation of the C++ MiniGit engine (mini_git_oop.cpp)
 * Features 64-bit FNV-1a hashing, interactive terminal, DAG visualizer, and Web Audio feedback.
 */

// ============================================================================
// 1. 64-BIT FNV-1a HASH ALGORITHM (Faithful to FileObject::makeHash in C++)
// ============================================================================
function fnv1a64(str) {
  let hash = 14695981039346656037n;
  const prime = 1099511628211n;
  const mask = 0xFFFFFFFFFFFFFFFFn;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  for (let b of bytes) {
    hash ^= BigInt(b);
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

// Current formatted timestamp matching C++ Repository::currentTime
function getFormattedTime() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

// ============================================================================
// 2. WEB AUDIO SYNTHESIZER (Feedback sounds)
// ============================================================================
class SoundEffects {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  init() {
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playKey() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 + Math.random() * 200, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }

  playCommit() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.04, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    } catch (e) {}
  }

  playError() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }
}

const sfx = new SoundEffects();

// ============================================================================
// 3. MINIGIT REPOSITORY ENGINE (Mirrors C++ OOP state)
// ============================================================================
class MiniGitEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.isInitialized = false;
    this.workingDirectory = {
      'main.cpp': '#include <iostream>\n\nint main() {\n    std::cout << "Hello MiniGit OOP!" << std::endl;\n    return 0;\n}\n',
      'README.md': '# MiniGit Project\nVersion control powered by modern C++17.\n'
    };
    this.stagedFiles = []; // Array of { hash, filename }
    this.objectsStore = {}; // Hash -> { filename, content }
    this.commits = []; // Array of { id, message, timestamp, files: [...] }
  }

  init() {
    if (this.isInitialized) {
      return { success: true, message: 'Reinitialized existing Mini Git repository in .minigit/' };
    }
    this.isInitialized = true;
    return { success: true, message: 'Initialized Mini Git repository in .minigit/' };
  }

  addFile(filename) {
    if (!this.isInitialized) {
      return { success: false, message: 'Repository not initialized. Run: minigit init' };
    }
    if (!(filename in this.workingDirectory)) {
      return { success: false, message: `File not found or not a regular file: ${filename}` };
    }

    const content = this.workingDirectory[filename];
    const hash = fnv1a64(content);

    // Save into objectsDirectory (.minigit/objects/<hash>)
    this.objectsStore[hash] = { filename, content };

    // Update staging index (.minigit/index)
    const existingIndex = this.stagedFiles.findIndex(item => item.filename === filename);
    if (existingIndex >= 0) {
      this.stagedFiles[existingIndex].hash = hash;
    } else {
      this.stagedFiles.push({ hash, filename });
    }

    return { success: true, hash, filename, message: `Staged ${filename} (hash ${hash})` };
  }

  commitChanges(message) {
    if (!this.isInitialized) {
      return { success: false, message: 'Repository not initialized. Run: minigit init' };
    }
    if (!message || message.trim() === '') {
      return { success: false, message: 'Commit message cannot be empty.' };
    }
    if (this.stagedFiles.length === 0) {
      return { success: false, message: 'Nothing staged. Use: minigit add <file>' };
    }

    const time = getFormattedTime();

    // Data for commit ID hash: message + time + (hash + filename for each staged file)
    let data = message + time;
    for (const item of this.stagedFiles) {
      data += item.hash + item.filename;
    }

    const commitId = fnv1a64(data);
    const commitRecord = {
      id: commitId,
      message,
      timestamp: time,
      files: [...this.stagedFiles]
    };

    this.commits.push(commitRecord);

    // Clear staging area after successful commit (matching C++ line 251)
    this.stagedFiles = [];

    return { success: true, commit: commitRecord, message: `Committed ${commitId} - ${message}` };
  }

  showHistory() {
    if (!this.isInitialized) {
      return { success: false, message: 'Repository not initialized. Run: minigit init' };
    }
    if (this.commits.length === 0) {
      return { success: true, message: 'No commits yet.' };
    }

    let output = '';
    // Display all commits
    for (const commit of [...this.commits].reverse()) {
      output += `commit ${commit.id}\n`;
      output += `message ${commit.message}\n`;
      output += `time ${commit.timestamp}\n`;
      output += `files:\n`;
      for (const item of commit.files) {
        output += `  ${item.hash} ${item.filename}\n`;
      }
      output += `-----------------------------\n`;
    }
    return { success: true, message: output };
  }

  status() {
    if (!this.isInitialized) {
      return { success: false, message: 'Repository not initialized. Run: minigit init' };
    }

    let out = 'On branch main\n\n';

    // Staged changes
    if (this.stagedFiles.length > 0) {
      out += 'Changes to be committed:\n';
      out += '  (use "minigit commit -m <msg>" to commit)\n';
      this.stagedFiles.forEach(file => {
        out += `\t[staged]   ${file.filename}  (${file.hash.substring(0, 8)}...)\n`;
      });
      out += '\n';
    }

    // Working directory comparison
    const stagedNames = new Set(this.stagedFiles.map(f => f.filename));
    const allWorking = Object.keys(this.workingDirectory);
    const untracked = allWorking.filter(f => !stagedNames.has(f));

    if (untracked.length > 0) {
      out += 'Untracked / unstaged files:\n';
      out += '  (use "minigit add <file>..." to include in what will be committed)\n';
      untracked.forEach(f => {
        out += `\t[untracked] ${f}\n`;
      });
      out += '\n';
    }

    if (this.stagedFiles.length === 0 && untracked.length === 0) {
      out += 'Nothing to commit, working tree clean\n';
    }

    return { success: true, message: out };
  }
}

const engine = new MiniGitEngine();

// ============================================================================
// 4. UI CONTROLLER & VIEW RENDERER
// ============================================================================
const dom = {
  // Status & Telemetry
  repoStatusPill: document.getElementById('repoStatusPill'),
  repoStatusText: document.getElementById('repoStatusText'),
  statCommits: document.getElementById('statCommits'),
  statStaged: document.getElementById('statStaged'),
  statObjects: document.getElementById('statObjects'),
  statHead: document.getElementById('statHead'),
  badgeStagedCount: document.getElementById('badgeStagedCount'),

  // Terminal
  terminalBody: document.getElementById('terminalBody'),
  terminalInput: document.getElementById('terminalInput'),
  btnExecuteCmd: document.getElementById('btnExecuteCmd'),
  btnClearTerminal: document.getElementById('btnClearTerminal'),
  btnHelpTerminal: document.getElementById('btnHelpTerminal'),

  // Visualizer / DAG
  graphContainer: document.getElementById('graphContainer'),
  graphEmptyState: document.getElementById('graphEmptyState'),
  dagSvg: document.getElementById('dagSvg'),
  dagNodesLayer: document.getElementById('dagNodesLayer'),
  stagedList: document.getElementById('stagedList'),
  workingFileList: document.getElementById('workingFileList'),
  btnQuickNewFile: document.getElementById('btnQuickNewFile'),

  // Hasher Sandbox
  hasherFilename: document.getElementById('hasherFilename'),
  hasherTextarea: document.getElementById('hasherTextarea'),
  liveHashResult: document.getElementById('liveHashResult'),
  charCount: document.getElementById('charCount'),
  byteCount: document.getElementById('byteCount'),
  objectPathDisplay: document.getElementById('objectPathDisplay'),
  btnSaveToWorkingDir: document.getElementById('btnSaveToWorkingDir'),
  btnDirectStage: document.getElementById('btnDirectStage'),

  // C++ Source
  cppSourceCode: document.getElementById('cppSourceCode'),
  btnCopyCppCode: document.getElementById('btnCopyCppCode'),

  // Internals
  internalsObjectsCount: document.getElementById('internalsObjectsCount'),
  internalsObjectsList: document.getElementById('internalsObjectsList'),
  internalsCommitsCount: document.getElementById('internalsCommitsCount'),
  internalsCommitsList: document.getElementById('internalsCommitsList'),
  internalsIndexStatus: document.getElementById('internalsIndexStatus'),
  internalsIndexContent: document.getElementById('internalsIndexContent'),

  // Global actions
  btnToggleSound: document.getElementById('btnToggleSound'),
  soundIcon: document.getElementById('soundIcon'),
  btnResetRepo: document.getElementById('btnResetRepo'),
  btnStartTour: document.getElementById('btnStartTour'),

  // Modals
  inspectorModal: document.getElementById('inspectorModal'),
  modalTitle: document.getElementById('modalTitle'),
  modalMeta: document.getElementById('modalMeta'),
  modalContent: document.getElementById('modalContent'),
  btnModalClose: document.getElementById('btnModalClose'),
  btnModalDismiss: document.getElementById('btnModalDismiss'),

  // Tour
  tourBackdrop: document.getElementById('tourBackdrop'),
  tourStepBadge: document.getElementById('tourStepBadge'),
  tourTitle: document.getElementById('tourTitle'),
  tourText: document.getElementById('tourText'),
  tourActionPreview: document.getElementById('tourActionPreview'),
  btnTourPrev: document.getElementById('btnTourPrev'),
  btnTourNext: document.getElementById('btnTourNext'),
  btnTourClose: document.getElementById('btnTourClose')
};

// Command History
const cmdHistory = [];
let historyIndex = -1;

// ============================================================================
// 5. TERMINAL COMMAND EXECUTION
// ============================================================================
function appendTerminalLine(text, className = '') {
  const line = document.createElement('div');
  line.className = `term-line ${className}`;
  line.textContent = text;
  dom.terminalBody.appendChild(line);
  dom.terminalBody.scrollTop = dom.terminalBody.scrollHeight;
}

function appendTerminalPrompt(cmd) {
  const line = document.createElement('div');
  line.className = 'term-line term-prompt-line';
  line.innerHTML = `<span class="prompt-user">minigit</span><span class="prompt-separator">:</span><span class="prompt-dir">~</span><span class="prompt-symbol">$</span> <span class="term-cmd">${escapeHtml(cmd)}</span>`;
  dom.terminalBody.appendChild(line);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function executeCommand(rawCommand) {
  const input = rawCommand.trim();
  if (!input) return;

  cmdHistory.push(input);
  historyIndex = cmdHistory.length;

  sfx.playKey();
  appendTerminalPrompt(input);

  // Parse arguments handling quotes
  const tokens = parseArguments(input);
  if (tokens.length === 0) return;

  let cmd = tokens[0];
  let args = tokens.slice(1);

  // Normalize './minigit' or 'minigit' prefix
  if (cmd === './minigit' || cmd === 'minigit') {
    if (args.length === 0) {
      appendTerminalLine('Mini Git commands:\n  ./minigit init\n  ./minigit add <filename>\n  ./minigit commit -m "message"\n  ./minigit log');
      return;
    }
    cmd = args[0];
    args = args.slice(1);
  }

  switch (cmd) {
    case 'init': {
      const res = engine.init();
      appendTerminalLine(res.message, 'term-success');
      updateAllViews();
      break;
    }

    case 'add': {
      if (args.length < 1) {
        appendTerminalLine('Usage: minigit add <filename>', 'term-warn');
        return;
      }
      const filename = args[0];
      const res = engine.addFile(filename);
      if (res.success) {
        appendTerminalLine(res.message, 'term-success');
      } else {
        appendTerminalLine(res.message, 'term-error');
        sfx.playError();
      }
      updateAllViews();
      break;
    }

    case 'commit': {
      let message = '';
      if (args.length >= 2 && args[0] === '-m') {
        message = args[1];
      } else if (args.length === 1 && args[0] !== '-m') {
        message = args[0];
      } else {
        appendTerminalLine('Usage: minigit commit -m "message"', 'term-warn');
        return;
      }

      const res = engine.commitChanges(message);
      if (res.success) {
        appendTerminalLine(res.message, 'term-success');
        sfx.playCommit();
      } else {
        appendTerminalLine(res.message, 'term-error');
        sfx.playError();
      }
      updateAllViews();
      break;
    }

    case 'log': {
      const res = engine.showHistory();
      if (res.success) {
        appendTerminalLine(res.message);
      } else {
        appendTerminalLine(res.message, 'term-error');
      }
      break;
    }

    case 'status': {
      const res = engine.status();
      if (res.success) {
        appendTerminalLine(res.message);
      } else {
        appendTerminalLine(res.message, 'term-error');
      }
      break;
    }

    case 'cat': {
      if (args.length < 1) {
        appendTerminalLine('Usage: cat <filename or path>', 'term-warn');
        return;
      }
      const target = args[0];
      if (target === '.minigit/index') {
        if (!engine.isInitialized) {
          appendTerminalLine('cat: .minigit/index: No such file or directory', 'term-error');
        } else if (engine.stagedFiles.length === 0) {
          appendTerminalLine('[Staging index is currently empty]');
        } else {
          let out = '';
          engine.stagedFiles.forEach(f => {
            out += `${f.hash} "${f.filename}"\n`;
          });
          appendTerminalLine(out);
        }
      } else if (target.startsWith('.minigit/objects/')) {
        const hash = target.replace('.minigit/objects/', '');
        if (hash in engine.objectsStore) {
          appendTerminalLine(engine.objectsStore[hash].content);
        } else {
          appendTerminalLine(`cat: ${target}: No such file or directory`, 'term-error');
        }
      } else if (target.startsWith('.minigit/commits/')) {
        const file = target.replace('.minigit/commits/', '');
        const id = file.replace('.commit', '');
        const commit = engine.commits.find(c => c.id === id);
        if (commit) {
          let out = `commit ${commit.id}\nmessage ${commit.message}\ntime ${commit.timestamp}\nfiles:\n`;
          commit.files.forEach(f => out += `${f.hash} ${f.filename}\n`);
          appendTerminalLine(out);
        } else {
          appendTerminalLine(`cat: ${target}: No such file or directory`, 'term-error');
        }
      } else if (target in engine.workingDirectory) {
        appendTerminalLine(engine.workingDirectory[target]);
      } else {
        appendTerminalLine(`cat: ${target}: No such file or directory`, 'term-error');
      }
      break;
    }

    case 'touch': {
      if (args.length < 1) {
        appendTerminalLine('Usage: touch <filename> [content]', 'term-warn');
        return;
      }
      const filename = args[0];
      const content = args[1] !== undefined ? args[1] : `// Created on ${new Date().toLocaleTimeString()}\n`;
      engine.workingDirectory[filename] = content;
      appendTerminalLine(`Created / updated virtual file: ${filename}`, 'term-success');
      updateAllViews();
      break;
    }

    case 'rm': {
      if (args.length < 1) {
        appendTerminalLine('Usage: rm <filename>', 'term-warn');
        return;
      }
      const filename = args[0];
      if (filename in engine.workingDirectory) {
        delete engine.workingDirectory[filename];
        appendTerminalLine(`Removed ${filename} from working directory`, 'term-warn');
        updateAllViews();
      } else {
        appendTerminalLine(`rm: cannot remove '${filename}': No such file or directory`, 'term-error');
      }
      break;
    }

    case 'ls': {
      const files = Object.keys(engine.workingDirectory);
      if (files.length === 0) {
        appendTerminalLine('(Working directory is empty)');
      } else {
        appendTerminalLine(files.join('   '));
      }
      break;
    }

    case 'clear': {
      dom.terminalBody.innerHTML = '';
      break;
    }

    case 'help': {
      appendTerminalLine(`MiniGit C++ Commands:
  minigit init                    Initialize .minigit repository
  minigit add <filename>          Stage file into .minigit/index & store blob
  minigit commit -m "message"     Save snapshot to .minigit/commits/<id>.commit
  minigit log                     Display chronological commit history
  status                          Display working tree vs staging status

Helper Commands:
  touch <file> [content]          Create or edit virtual file
  cat <file or path>              Print contents (.minigit/index, objects, etc.)
  ls                              List files in working directory
  clear                           Clear terminal screen
  demo                            Run automated demonstration tour`);
      break;
    }

    case 'demo': {
      startInteractiveTour();
      break;
    }

    default: {
      appendTerminalLine(`Unknown command: ${cmd}. Type 'help' for available commands.`, 'term-error');
      sfx.playError();
      break;
    }
  }

  dom.terminalBody.scrollTop = dom.terminalBody.scrollHeight;
}

// Helper to parse arguments respecting quotes
function parseArguments(str) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if ((ch === '"' || ch === "'") && (!inQuotes || ch === quoteChar)) {
      inQuotes = !inQuotes;
      quoteChar = inQuotes ? ch : '';
    } else if (ch === ' ' && !inQuotes) {
      if (current.length > 0) {
        result.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    result.push(current);
  }
  return result;
}

// ============================================================================
// 6. RENDERERS & VIEW UPDATERS
// ============================================================================
function updateAllViews() {
  updateHeaderStats();
  renderStagedList();
  renderWorkingFiles();
  renderCommitGraph();
  renderInternals();
}

function updateHeaderStats() {
  dom.statCommits.textContent = engine.commits.length;
  dom.statStaged.textContent = engine.stagedFiles.length;
  dom.statObjects.textContent = Object.keys(engine.objectsStore).length;
  dom.badgeStagedCount.textContent = `${engine.stagedFiles.length} files`;

  if (engine.isInitialized) {
    dom.repoStatusPill.className = 'status-pill active-repo';
    dom.repoStatusText.textContent = '.minigit active';
    if (engine.commits.length > 0) {
      const head = engine.commits[engine.commits.length - 1];
      dom.statHead.textContent = head.id.substring(0, 7);
    } else {
      dom.statHead.textContent = 'None';
    }
  } else {
    dom.repoStatusPill.className = 'status-pill';
    dom.repoStatusText.textContent = 'Uninitialized';
    dom.statHead.textContent = 'None';
  }
}

function renderStagedList() {
  dom.stagedList.innerHTML = '';
  if (engine.stagedFiles.length === 0) {
    dom.stagedList.innerHTML = `<div class="empty-subtext">No files currently staged. Use <code class="code-inline">minigit add &lt;filename&gt;</code> to stage.</div>`;
    return;
  }

  engine.stagedFiles.forEach(file => {
    const row = document.createElement('div');
    row.className = 'staged-item-row';
    row.innerHTML = `
      <span class="staged-filename">${file.filename}</span>
      <span class="staged-hash" title="FNV-1a 64-bit hash">${file.hash.substring(0, 10)}...</span>
    `;
    row.addEventListener('click', () => {
      openInspectorModal(`Staged Object: ${file.filename}`, `Hash: ${file.hash}`, engine.objectsStore[file.hash]?.content || '');
    });
    dom.stagedList.appendChild(row);
  });
}

function renderWorkingFiles() {
  dom.workingFileList.innerHTML = '';
  const files = Object.keys(engine.workingDirectory);
  if (files.length === 0) {
    dom.workingFileList.innerHTML = `<div class="empty-subtext">No files in directory. Click "+ New File" to create one.</div>`;
    return;
  }

  const stagedMap = new Map(engine.stagedFiles.map(f => [f.filename, f.hash]));

  files.forEach(filename => {
    const content = engine.workingDirectory[filename];
    const currentHash = fnv1a64(content);
    const isStaged = stagedMap.get(filename) === currentHash;

    const card = document.createElement('div');
    card.className = 'working-file-card';
    card.innerHTML = `
      <div class="file-info">
        <span class="file-name">${filename}</span>
        <span class="file-status-tag ${isStaged ? 'staged' : ''}">${isStaged ? '✓ STAGED' : 'UNSTAGED'}</span>
      </div>
      <div class="file-actions">
        <button class="btn btn-xs btn-outline btn-edit-file" title="Edit content in Hasher Sandbox">Edit</button>
        <button class="btn btn-xs btn-primary btn-stage-file" title="Stage file">Stage</button>
      </div>
    `;

    card.querySelector('.btn-stage-file').addEventListener('click', () => {
      executeCommand(`minigit add ${filename}`);
    });

    card.querySelector('.btn-edit-file').addEventListener('click', () => {
      dom.hasherFilename.value = filename;
      dom.hasherTextarea.value = engine.workingDirectory[filename];
      updateLiveHasher();
      switchTab('tab-hasher');
    });

    dom.workingFileList.appendChild(card);
  });
}

function renderCommitGraph() {
  dom.dagNodesLayer.innerHTML = '';
  dom.dagSvg.innerHTML = '';

  if (engine.commits.length === 0) {
    dom.graphEmptyState.style.display = 'flex';
    return;
  }
  dom.graphEmptyState.style.display = 'none';

  const commits = engine.commits;
  commits.forEach((commit, idx) => {
    const isHead = idx === commits.length - 1;
    const card = document.createElement('div');
    card.className = `commit-node-card ${isHead ? 'head-commit' : ''}`;
    card.innerHTML = `
      ${isHead ? '<span class="commit-head-badge">HEAD</span>' : ''}
      <span class="commit-hash-chip">${commit.id.substring(0, 8)}</span>
      <span class="commit-msg-preview" title="${commit.message}">${commit.message}</span>
      <span class="commit-time-meta">${commit.timestamp.split(' ')[1]}</span>
    `;

    card.addEventListener('click', () => {
      let rawText = `commit ${commit.id}\nmessage ${commit.message}\ntime ${commit.timestamp}\nfiles:\n`;
      commit.files.forEach(f => {
        rawText += `  ${f.hash} ${f.filename}\n`;
      });
      openInspectorModal(`Commit Object (${commit.id.substring(0, 10)})`, `Timestamp: ${commit.timestamp}`, rawText);
    });

    dom.dagNodesLayer.appendChild(card);
  });
}

function renderInternals() {
  // Objects
  const hashes = Object.keys(engine.objectsStore);
  dom.internalsObjectsCount.textContent = `${hashes.length} objects`;
  dom.internalsObjectsList.innerHTML = '';
  if (hashes.length === 0) {
    dom.internalsObjectsList.innerHTML = `<div class="empty-subtext">No objects saved yet.</div>`;
  } else {
    hashes.forEach(hash => {
      const obj = engine.objectsStore[hash];
      const item = document.createElement('div');
      item.className = 'file-blob-item';
      item.innerHTML = `
        <span class="blob-hash">${hash.substring(0, 12)}...</span>
        <span style="font-size:0.75rem; color:#94a3b8;">${obj.filename}</span>
      `;
      item.addEventListener('click', () => {
        openInspectorModal(`Blob Object: ${hash}`, `File: ${obj.filename}`, obj.content);
      });
      dom.internalsObjectsList.appendChild(item);
    });
  }

  // Commits
  dom.internalsCommitsCount.textContent = `${engine.commits.length} commits`;
  dom.internalsCommitsList.innerHTML = '';
  if (engine.commits.length === 0) {
    dom.internalsCommitsList.innerHTML = `<div class="empty-subtext">No commits made yet.</div>`;
  } else {
    engine.commits.forEach(commit => {
      const item = document.createElement('div');
      item.className = 'file-blob-item';
      item.innerHTML = `
        <span class="blob-hash" style="color:var(--accent-cyan);">${commit.id.substring(0, 10)}.commit</span>
        <span style="font-size:0.75rem; color:#94a3b8;">${commit.message.substring(0, 15)}...</span>
      `;
      item.addEventListener('click', () => {
        let rawText = `commit ${commit.id}\nmessage ${commit.message}\ntime ${commit.timestamp}\nfiles:\n`;
        commit.files.forEach(f => rawText += `${f.hash} ${f.filename}\n`);
        openInspectorModal(`Commit File: ${commit.id}.commit`, `Created: ${commit.timestamp}`, rawText);
      });
      dom.internalsCommitsList.appendChild(item);
    });
  }

  // Index
  if (!engine.isInitialized) {
    dom.internalsIndexStatus.textContent = 'Uninitialized';
    dom.internalsIndexContent.innerHTML = '<code>[Repository not initialized]</code>';
  } else if (engine.stagedFiles.length === 0) {
    dom.internalsIndexStatus.textContent = 'Clean / Empty';
    dom.internalsIndexContent.innerHTML = '<code># .minigit/index (empty)</code>';
  } else {
    dom.internalsIndexStatus.textContent = `${engine.stagedFiles.length} staged`;
    let raw = '';
    engine.stagedFiles.forEach(f => {
      raw += `${f.hash} "${f.filename}"\n`;
    });
    dom.internalsIndexContent.innerHTML = `<code>${escapeHtml(raw)}</code>`;
  }
}

// ============================================================================
// 7. LIVE FNV-1a HASHER SANDBOX
// ============================================================================
function updateLiveHasher() {
  const text = dom.hasherTextarea.value;
  const hash = fnv1a64(text);
  dom.liveHashResult.textContent = hash;
  dom.objectPathDisplay.textContent = `.minigit/objects/${hash}`;
  dom.charCount.textContent = `${text.length} characters`;

  const encoder = new TextEncoder();
  const byteLen = encoder.encode(text).length;
  dom.byteCount.textContent = `${byteLen} bytes`;
}

dom.hasherTextarea.addEventListener('input', () => {
  sfx.playKey();
  updateLiveHasher();
});

dom.btnSaveToWorkingDir.addEventListener('click', () => {
  const filename = dom.hasherFilename.value.trim() || 'demo.txt';
  const content = dom.hasherTextarea.value;
  engine.workingDirectory[filename] = content;
  appendTerminalLine(`Saved file ${filename} to working tree.`, 'term-success');
  updateAllViews();
  switchTab('tab-terminal');
});

dom.btnDirectStage.addEventListener('click', () => {
  const filename = dom.hasherFilename.value.trim() || 'demo.txt';
  const content = dom.hasherTextarea.value;
  engine.workingDirectory[filename] = content;
  executeCommand(`minigit add ${filename}`);
  switchTab('tab-terminal');
});

// ============================================================================
// 8. TABS & MODALS
// ============================================================================
function switchTab(targetId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === targetId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === targetId);
  });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
  });
});

function openInspectorModal(title, meta, content) {
  dom.modalTitle.textContent = title;
  dom.modalMeta.textContent = meta;
  dom.modalContent.textContent = content;
  dom.inspectorModal.classList.add('open');
}

function closeInspectorModal() {
  dom.inspectorModal.classList.remove('open');
}

dom.btnModalClose.addEventListener('click', closeInspectorModal);
dom.btnModalDismiss.addEventListener('click', closeInspectorModal);
dom.inspectorModal.addEventListener('click', e => {
  if (e.target === dom.inspectorModal) closeInspectorModal();
});

// ============================================================================
// 9. QUICK CHIPS & TERMINAL INPUT
// ============================================================================
document.querySelectorAll('.cmd-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const cmd = chip.dataset.cmd;
    dom.terminalInput.value = cmd;
    executeCommand(cmd);
    dom.terminalInput.value = '';
  });
});

dom.terminalInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const cmd = dom.terminalInput.value;
    dom.terminalInput.value = '';
    executeCommand(cmd);
  } else if (e.key === 'ArrowUp') {
    if (cmdHistory.length > 0 && historyIndex > 0) {
      historyIndex--;
      dom.terminalInput.value = cmdHistory[historyIndex];
    }
  } else if (e.key === 'ArrowDown') {
    if (historyIndex < cmdHistory.length - 1) {
      historyIndex++;
      dom.terminalInput.value = cmdHistory[historyIndex];
    } else {
      historyIndex = cmdHistory.length;
      dom.terminalInput.value = '';
    }
  }
});

dom.btnExecuteCmd.addEventListener('click', () => {
  const cmd = dom.terminalInput.value;
  dom.terminalInput.value = '';
  executeCommand(cmd);
});

dom.btnClearTerminal.addEventListener('click', () => {
  dom.terminalBody.innerHTML = '';
});

dom.btnHelpTerminal.addEventListener('click', () => {
  executeCommand('help');
});

dom.btnQuickNewFile.addEventListener('click', () => {
  const name = prompt('Enter filename (e.g. app.cpp, config.json):', 'feature.cpp');
  if (name) {
    engine.workingDirectory[name] = `// Content of ${name}\n`;
    appendTerminalLine(`Created virtual file: ${name}`, 'term-success');
    updateAllViews();
  }
});

// Sound Toggle
dom.btnToggleSound.addEventListener('click', () => {
  sfx.enabled = !sfx.enabled;
  dom.soundIcon.textContent = sfx.enabled ? '🔊' : '🔇';
});

// Reset Repo
dom.btnResetRepo.addEventListener('click', () => {
  if (confirm('Reset MiniGit repository state to clean default?')) {
    engine.reset();
    appendTerminalLine('--- Repository state reset to default uninitialized ---', 'term-warn');
    updateAllViews();
  }
});

// ============================================================================
// 10. INTERACTIVE TOUR WALKTHROUGH
// ============================================================================
const tourSteps = [
  {
    step: 'Step 1 of 5',
    title: '1. Initialize Repository',
    text: 'MiniGit encapsulates repository management inside the Repository class. Running "minigit init" creates the .minigit/ directory structure: objects/, commits/, and index.',
    command: 'minigit init'
  },
  {
    step: 'Step 2 of 5',
    title: '2. Create a C++ Source File',
    text: 'Let us create a virtual source file "main.cpp" in our working tree. Notice how files exist in the working directory before being tracked.',
    command: 'touch main.cpp "#include <iostream>\\nint main() { return 0; }"'
  },
  {
    step: 'Step 3 of 5',
    title: '3. Stage File & Compute FNV-1a Hash',
    text: 'Running "minigit add main.cpp" calls FileObject::makeHash(), saves the content blob into .minigit/objects/<hash>, and records the entry in the staging index .minigit/index.',
    command: 'minigit add main.cpp'
  },
  {
    step: 'Step 4 of 5',
    title: '4. Commit Changes (Create Snapshot)',
    text: 'Running "minigit commit" constructs an immutable Commit object encapsulating metadata, timestamp, and staged files, then clears the staging index.',
    command: 'minigit commit -m "Initial commit: create main.cpp"'
  },
  {
    step: 'Step 5 of 5',
    title: '5. View History & Commit DAG',
    text: 'Run "minigit log" to view the complete commit history. Notice how your glowing commit node is now rendered in the Interactive Commit DAG above!',
    command: 'minigit log'
  }
];

let currentTourIndex = 0;

function showTourStep(index) {
  if (index < 0 || index >= tourSteps.length) {
    dom.tourBackdrop.classList.remove('open');
    return;
  }
  currentTourIndex = index;
  const data = tourSteps[index];
  dom.tourStepBadge.textContent = data.step;
  dom.tourTitle.textContent = data.title;
  dom.tourText.textContent = data.text;
  dom.tourActionPreview.textContent = data.command;
  dom.btnTourNext.textContent = index === tourSteps.length - 1 ? 'Finish Tour ✓' : 'Auto-Run Step ➔';
  dom.btnTourPrev.style.display = index === 0 ? 'none' : 'inline-block';
  dom.tourBackdrop.classList.add('open');
}

function startInteractiveTour() {
  switchTab('tab-terminal');
  showTourStep(0);
}

dom.btnStartTour.addEventListener('click', startInteractiveTour);
dom.btnTourClose.addEventListener('click', () => dom.tourBackdrop.classList.remove('open'));
dom.btnTourPrev.addEventListener('click', () => showTourStep(currentTourIndex - 1));
dom.btnTourNext.addEventListener('click', () => {
  const currentCmd = tourSteps[currentTourIndex].command;
  executeCommand(currentCmd);
  if (currentTourIndex < tourSteps.length - 1) {
    showTourStep(currentTourIndex + 1);
  } else {
    dom.tourBackdrop.classList.remove('open');
  }
});

// Copy C++ Code
dom.btnCopyCppCode.addEventListener('click', () => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(cppSource);
    dom.btnCopyCppCode.innerHTML = '<span>Copied ✓</span>';
    setTimeout(() => {
      dom.btnCopyCppCode.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copy C++ Code</span>`;
    }, 2000);
  }
});

// C++ Source Code Content
const cppSource = `#include <cstdint>
#include <ctime>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <memory>
#include <sstream>
#include <string>
#include <vector>

namespace fs = std::filesystem;
using namespace std;

// A small record describing one staged file.
struct StagedFile {
    string hash;
    string filename;
};

// Represents a saved version of a file.
class FileObject {
private:
    string filename;
    string content;
    string hash;

public:
    FileObject(const string& name, const string& data)
        : filename(name), content(data), hash(makeHash(data)) {}

    static string makeHash(const string& data) {
        // FNV-1a 64-bit hash. Content-addressable storage.
        uint64_t value = 14695981039346656037ULL;
        for (unsigned char ch : data) {
            value ^= ch;
            value *= 1099511628211ULL;
        }

        ostringstream output;
        output << hex << setw(16) << setfill('0') << value;
        return output.str();
    }

    const string& getFilename() const { return filename; }
    const string& getContent() const { return content; }
    const string& getHash() const { return hash; }

    bool save(const fs::path& objectsDirectory) const {
        ofstream file(objectsDirectory / hash, ios::binary);
        if (!file) return false;
        file.write(content.data(), static_cast<streamsize>(content.size()));
        return static_cast<bool>(file);
    }
};

// Represents a commit and its metadata.
class Commit {
private:
    string id;
    string message;
    string timestamp;
    vector<StagedFile> files;

public:
    Commit(const string& commitId, const string& commitMessage,
           const string& time, const vector<StagedFile>& stagedFiles)
        : id(commitId), message(commitMessage), timestamp(time), files(stagedFiles) {}

    bool save(const fs::path& commitsDirectory) const {
        ofstream file(commitsDirectory / (id + ".commit"));
        if (!file) return false;

        file << "commit " << id << '\\n';
        file << "message " << message << '\\n';
        file << "time " << timestamp << '\\n';
        file << "files:\\n";
        for (const auto& item : files) {
            file << item.hash << ' ' << item.filename << '\\n';
        }
        return static_cast<bool>(file);
    }

    void display() const {
        cout << "Commit: " << id << '\\n'
             << "Message: " << message << '\\n'
             << "Time: " << timestamp << '\\n'
             << "Files:\\n";
        for (const auto& item : files) {
            cout << "  " << item.filename << " [" << item.hash << "]\\n";
        }
        cout << "-----------------------------\\n";
    }
};

// Repository encapsulates the data and operations of Mini Git.
class Repository {
private:
    const fs::path root = ".minigit";
    const fs::path objectsDirectory = ".minigit/objects";
    const fs::path commitsDirectory = ".minigit/commits";
    const fs::path indexFile = ".minigit/index";
    vector<StagedFile> stagedFiles;

    bool isInitialized() const {
        return fs::exists(root) && fs::exists(objectsDirectory)
            && fs::exists(commitsDirectory) && fs::exists(indexFile);
    }

    bool loadIndex() {
        stagedFiles.clear();
        ifstream file(indexFile);
        if (!file) return false;

        string hash, filename;
        while (file >> hash >> quoted(filename)) {
            stagedFiles.push_back({hash, filename});
        }
        return true;
    }

    bool saveIndex() const {
        ofstream file(indexFile);
        if (!file) return false;
        for (const auto& item : stagedFiles) {
            file << item.hash << ' ' << quoted(item.filename) << '\\n';
        }
        return static_cast<bool>(file);
    }

    static string currentTime() {
        time_t now = time(nullptr);
        tm* local = localtime(&now);
        if (!local) return "unknown";
        ostringstream output;
        output << put_time(local, "%Y-%m-%d %H:%M:%S");
        return output.str();
    }

public:
    bool init() {
        error_code error;
        fs::create_directories(objectsDirectory, error);
        if (error) return false;
        fs::create_directories(commitsDirectory, error);
        if (error) return false;
        ofstream index(indexFile, ios::app);
        if (!index) return false;
        cout << "Initialized Mini Git repository in .minigit/\\n";
        return true;
    }

    bool addFile(const string& filename) {
        if (!isInitialized()) {
            cerr << "Repository not initialized. Run: minigit init\\n";
            return false;
        }
        if (!fs::exists(filename) || !fs::is_regular_file(filename)) {
            cerr << "File not found or not a regular file: " << filename << '\\n';
            return false;
        }

        ifstream input(filename, ios::binary);
        if (!input) return false;
        string content((istreambuf_iterator<char>(input)), istreambuf_iterator<char>());
        FileObject object(filename, content);

        if (!object.save(objectsDirectory)) return false;
        if (!loadIndex()) return false;

        for (auto& item : stagedFiles) {
            if (item.filename == filename) {
                item.hash = object.getHash();
                if (!saveIndex()) return false;
                cout << "Staged " << filename << " (hash " << object.getHash() << ")\\n";
                return true;
            }
        }

        stagedFiles.push_back({object.getHash(), filename});
        if (!saveIndex()) return false;
        cout << "Staged " << filename << " (hash " << object.getHash() << ")\\n";
        return true;
    }

    bool commitChanges(const string& message) {
        if (!isInitialized()) return false;
        if (message.empty() || stagedFiles.empty()) return false;

        string time = currentTime();
        ostringstream data;
        data << message << time;
        for (const auto& item : stagedFiles) {
            data << item.hash << item.filename;
        }

        string id = FileObject::makeHash(data.str());
        Commit commit(id, message, time, stagedFiles);
        if (!commit.save(commitsDirectory)) return false;

        stagedFiles.clear();
        if (!saveIndex()) return false;
        cout << "Committed " << id << " - " << message << '\\n';
        return true;
    }

    bool showHistory() const {
        if (!isInitialized()) return false;
        bool found = false;
        for (const auto& entry : fs::directory_iterator(commitsDirectory)) {
            if (!entry.is_regular_file() || entry.path().extension() != ".commit") continue;
            ifstream file(entry.path());
            if (!file) continue;
            cout << file.rdbuf() << "-----------------------------\\n";
            found = true;
        }
        if (!found) cout << "No commits yet.\\n";
        return true;
    }
};

// Abstract base class: Command Pattern
class Command {
public:
    virtual bool execute(Repository& repository, const vector<string>& arguments) = 0;
    virtual ~Command() = default;
};

class InitCommand : public Command {
public:
    bool execute(Repository& repository, const vector<string>&) override {
        return repository.init();
    }
};

class AddCommand : public Command {
public:
    bool execute(Repository& repository, const vector<string>& arguments) override {
        if (arguments.size() != 1) return false;
        return repository.addFile(arguments[0]);
    }
};

class CommitCommand : public Command {
public:
    bool execute(Repository& repository, const vector<string>& arguments) override {
        if (arguments.size() != 1) return false;
        return repository.commitChanges(arguments[0]);
    }
};

class LogCommand : public Command {
public:
    bool execute(Repository& repository, const vector<string>&) override {
        return repository.showHistory();
    }
};

int main(int argc, char* argv[]) {
    if (argc < 2) {
        cout << "Mini Git commands:\\n  ./minigit init\\n  ./minigit add <filename>\\n  ./minigit commit -m \\"message\\"\\n  ./minigit log\\n";
        return 0;
    }
    string action = argv[1];
    vector<string> arguments;
    unique_ptr<Command> command;

    if (action == "init") command = make_unique<InitCommand>();
    else if (action == "add") { command = make_unique<AddCommand>(); if (argc >= 3) arguments.push_back(argv[2]); }
    else if (action == "commit") { command = make_unique<CommitCommand>(); if (argc >= 4 && string(argv[2]) == "-m") arguments.push_back(argv[3]); }
    else if (action == "log") command = make_unique<LogCommand>();
    else return 1;

    Repository repository;
    return command->execute(repository, arguments) ? 0 : 1;
}`;

// Initialize View on Page Load
document.addEventListener('DOMContentLoaded', () => {
  dom.cppSourceCode.textContent = cppSource;
  updateLiveHasher();
  updateAllViews();
});
