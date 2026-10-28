# **** MiniGit OOP | C++17 Version Control System & Visualizer ****
Link: https://gitversion.vercel.app/

<div align="center">

![C++17](https://img.shields.io/badge/C%2B%2B-17-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white)
![Build](https://img.shields.io/badge/Build-Passing-10b981?style=for-the-badge&logo=cmake&logoColor=white)
![Architecture](https://img.shields.io/badge/Architecture-OOP%20%7C%20Command%20Pattern-a855f7?style=for-the-badge)
![Hashing](https://img.shields.io/badge/Hashing-FNV--1a%2064--bit-06b6d4?style=for-the-badge)
![Deployment](https://img.shields.io/badge/Deploy-Vercel%20Ready-000000?style=for-the-badge&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)

<br />

**An Object-Oriented Version Control System built in modern C++17, demonstrating core Git internals: Content-Addressable Storage (CAS), 64-bit FNV-1a hashing, immutable commit snapshot trees, and the Command Design Pattern.**

<p align="center">
  <a href="#-interactive-web-simulator--visualizer">🌐 Live Web Simulator</a> •
  <a href="#-core-oop-architecture">🏛️ OOP Architecture</a> •
  <a href="#-git-internals--how-it-works">⚙️ Git Internals</a> •
  <a href="#-cli-quickstart">💻 CLI Quickstart</a> •
  <a href="#-build--testing">🛠️ Build & Test</a> •
  <a href="#-deploying-to-vercel">🚀 Vercel Deploy</a>
</p>

</div>

---

## 🌟 Overview

**MiniGit** demystifies how distributed version control systems like Git work under the hood. While standard Git can feel like a black box of cryptic plumbing and porcelain commands, MiniGit recreates the foundational architecture from scratch in modern, elegant C++17:

1. **Content-Addressable Storage (CAS)**: Files are stored and retrieved by the cryptographic hash of their contents rather than their names.
2. **Object Immutability**: Once written to disk in `.minigit/objects/`, a blob is never modified.
3. **Point-in-Time Snapshots**: Commits do not store diff deltas; they preserve complete repository state snapshots referencing object hashes.
4. **Command Pattern & Polymorphism**: Decoupled, extensible CLI architecture adhering to the SOLID Open/Closed Principle.

---

## 🌐 Interactive Web Simulator & Visualizer

MiniGit includes an ultra-sleek, **OLED black-themed web visualizer and terminal emulator** that allows anyone to explore and test the system directly in the browser!

### Key Features of the Web Frontend:
- 💻 **Interactive UNIX Terminal Emulator**: Execute `minigit init`, `add`, `commit -m "..."`, `log`, `status`, and `cat` in an authentic shell with history and autocomplete.
- 🌳 **Real-Time Commit DAG Visualizer**: Dynamic Directed Acyclic Graph rendering glowing commit nodes and branch pointers with 1-click snapshot inspection.
- ⚡ **Live 64-Bit FNV-1a Hasher**: Keystroke-by-keystroke cryptographic hashing sandbox matching the C++ `FileObject::makeHash()` algorithm byte-for-byte.
- 🏛️ **OOP Architecture Explorer**: Interactive architectural cards breaking down Encapsulation, Facade, Abstraction, and Polymorphism.
- 📁 **`.minigit/` Internal File Store Inspector**: Browse raw contents of `.minigit/objects/`, `.minigit/commits/`, and the `.minigit/index` staging table in real time.
- 🔊 **Synthesizer Sound Effects**: Optional mechanical keyboard feedback and commit chime using the Web Audio API.

---

## 🏛️ Core OOP Architecture

MiniGit is architected from the ground up around four primary Object-Oriented design principles:

```
                      +-------------------+
                      |   CLI Argument    |
                      |   Parser (main)   |
                      +---------+---------+
                                |
             +------------------+------------------+
             | std::make_unique<Command>()         |
             v                                     v
+------------------------+             +------------------------+
|   <<abstract class>>   |             |       Repository       |
|        Command         |             |        (Facade)        |
+------------------------+             +-----------+------------+
| + execute(repo, args)* |                         |
+-----------+------------+                         |
            |                                      | orchestrates
    +-------+-------+                              |
    |               |                              v
+---+----+     +----+---+             +------------------------+
|  Init  |     | Commit |  creates    |       FileObject       |
|Command | ... |Command +------------>|    (Encapsulation)     |
+--------+     +--------+             +------------------------+
                                                   |
                                                   v
                                      +------------------------+
                                      |         Commit         |
                                      |   (Snapshot Entity)    |
                                      +------------------------+
```

### 1. The Command Pattern (`class Command`)
Decouples user interface and command-line parsing from repository execution logic.
- **Abstract Base Class**: `Command` defines a pure virtual `execute(Repository&, const vector<string>&)` function and a `virtual ~Command() = default;` for safe polymorphic cleanup.
- **Concrete Implementations**: `InitCommand`, `AddCommand`, `CommitCommand`, and `LogCommand`.
- **Open/Closed Principle (OCP)**: Adding new commands (e.g. `diff`, `checkout`, `branch`) requires adding a new subclass without touching existing classes.

### 2. Encapsulation & CAS (`class FileObject`)
- Keeps file data, filename, and 64-bit content hash private.
- **Deterministic Hashing**: Computes the 64-bit FNV-1a hash upon construction.
- Guarantees that two identical file contents produce identical hashes, eliminating redundant storage in `.minigit/objects/`.

### 3. Snapshot Entity (`class Commit`)
- Binds commit metadata (`id`, `message`, `timestamp`) and a vector of staged file records (`vector<StagedFile>`).
- Serializes snapshots into immutable records stored in `.minigit/commits/<id>.commit`.

### 4. The Facade Pattern (`class Repository`)
- Manages the internal filesystem layout (`.minigit/root`, `objects/`, `commits/`, `index`).
- Encapsulates atomic reads and writes of the staging index using `std::filesystem` and `std::quoted`.

---

## ⚙️ Git Internals: How It Works

MiniGit creates a hidden directory named `.minigit/` in your repository root:

```
your_project/
├── .minigit/
│   ├── objects/
│   │   ├── 779a65e7023cd2e7       # Content-addressable binary blob
│   │   └── d90b98a88968845b       # Content-addressable binary blob
│   ├── commits/
│   │   └── 14243d354f4ebf66.commit # Commit snapshot descriptor
│   └── index                      # Staging area table: <hash> "<filename>"
├── main.cpp
└── Makefile
```

### 1. FNV-1a 64-Bit Hashing Algorithm
MiniGit uses the Fowler–Noll–Vo (FNV-1a) 64-bit non-cryptographic hashing algorithm:

$$\text{hash} = \text{offset\_basis} \quad (14695981039346656037)$$
$$\text{For each byte } b: \quad \text{hash} = (\text{hash} \oplus b) \times \text{FNV\_prime} \quad (1099511628211)$$

The resulting 64-bit integer is formatted as a 16-character hexadecimal string, serving as the unique content key for all blobs and commits.

### 2. Commit File Structure
Every commit is recorded on disk as a plain-text descriptor:
```text
commit 14243d354f4ebf66
message Initial project commit
time 2026-10-28 10:41:54
files:
d90b98a88968845b main.cpp
779a65e7023cd2e7 README.md
```

---

## 💻 CLI Quickstart

### 1. Initialize a Repository
Creates the `.minigit/` directory tree and staging index:
```bash
./minigit init
# Output: Initialized Mini Git repository in .minigit/
```

### 2. Stage Files (`add`)
Reads the file, calculates its FNV-1a hash, writes the blob into `.minigit/objects/<hash>`, and updates `.minigit/index`:
```bash
./minigit add main.cpp
# Output: Staged main.cpp (hash d90b98a88968845b)
```

### 3. Commit Changes
Captures an immutable snapshot of all staged files and resets the index:
```bash
./minigit commit -m "Add main entrypoint and core routines"
# Output: Committed 14243d354f4ebf66 - Add main entrypoint and core routines
```

### 4. Inspect History (`log`)
Displays all saved commits in chronological order:
```bash
./minigit log
```

---

## 🛠️ Build & Testing

### Prerequisites
- Modern C++ compiler supporting **C++17** (`clang++ >= 9.0` or `g++ >= 8.0`)
- Standard POSIX build tools (`make`) or `cmake >= 3.14`

### Build with `make` (Recommended)
```bash
# Build the minigit executable
make

# Run the automated test suite
make test

# Clean build artifacts
make clean
```

### Build with `clang++` or `g++` directly
```bash
# Compile with C++17 and optimization
clang++ -std=c++17 -Wall -Wextra -O2 mini_git_oop.cpp -o minigit

# Test executable
./minigit
```

### Build with CMake
```bash
mkdir build && cd build
cmake ..
cmake --build .
```

---

##  Deploying to Vercel
https://gitversion.vercel.app/

---

## 📊 Repository Language Breakdown

This repository is strictly configured via [`.gitattributes`](file:///.gitattributes) to ensure **C++ remains the recognized primary language on GitHub** (>95%). Frontend web visualizer assets are marked with `linguist-detectable=false` and `linguist-vendored` so GitHub's Linguist engine accurately counts the C++ codebase as the dominant language.

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).
Feel free to fork, explore, and use this codebase for academic studies and software architecture demonstrations.

<div align="center">
  <b>Built with ❤️ and Modern C++17 by <a href="https://github.com/ayushixx">Ayushi Sharma</a></b>
</div>
