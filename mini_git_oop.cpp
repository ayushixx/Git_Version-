#include <cstdint>
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
        // FNV-1a 64-bit hash. Useful for this educational project,
        // but it is not a cryptographic security hash.
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

        file << "commit " << id << '\n';
        file << "message " << message << '\n';
        file << "time " << timestamp << '\n';
        file << "files:\n";
        for (const auto& item : files) {
            file << item.hash << ' ' << item.filename << '\n';
        }
        return static_cast<bool>(file);
    }

    void display() const {
        cout << "Commit: " << id << '\n'
             << "Message: " << message << '\n'
             << "Time: " << timestamp << '\n'
             << "Files:\n";
        for (const auto& item : files) {
            cout << "  " << item.filename << " [" << item.hash << "]\n";
        }
        cout << "-----------------------------\n";
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
            file << item.hash << ' ' << quoted(item.filename) << '\n';
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
        if (error) {
            cerr << "Could not create objects directory: " << error.message() << '\n';
            return false;
        }

        fs::create_directories(commitsDirectory, error);
        if (error) {
            cerr << "Could not create commits directory: " << error.message() << '\n';
            return false;
        }

        ofstream index(indexFile, ios::app);
        if (!index) {
            cerr << "Could not create staging index.\n";
            return false;
        }
        cout << "Initialized Mini Git repository in .minigit/\n";
        return true;
    }

    bool addFile(const string& filename) {
        if (!isInitialized()) {
            cerr << "Repository not initialized. Run: minigit init\n";
            return false;
        }

        if (!fs::exists(filename) || !fs::is_regular_file(filename)) {
            cerr << "File not found or not a regular file: " << filename << '\n';
            return false;
        }

        ifstream input(filename, ios::binary);
        if (!input) {
            cerr << "Could not read file: " << filename << '\n';
            return false;
        }

        string content((istreambuf_iterator<char>(input)), istreambuf_iterator<char>());
        FileObject object(filename, content);

        if (!object.save(objectsDirectory)) {
            cerr << "Could not save file object.\n";
            return false;
        }

        if (!loadIndex()) {
            cerr << "Could not read staging index.\n";
            return false;
        }

        // Replace an existing staged entry for the same filename.
        for (auto& item : stagedFiles) {
            if (item.filename == filename) {
                item.hash = object.getHash();
                if (!saveIndex()) {
                    cerr << "Could not update staging index.\n";
                    return false;
                }
                cout << "Staged " << filename << " (hash " << object.getHash() << ")\n";
                return true;
            }
        }

        stagedFiles.push_back({object.getHash(), filename});
        if (!saveIndex()) {
            cerr << "Could not update staging index.\n";
            return false;
        }

        cout << "Staged " << filename << " (hash " << object.getHash() << ")\n";
        return true;
    }

    bool commitChanges(const string& message) {
        if (!isInitialized()) {
            cerr << "Repository not initialized. Run: minigit init\n";
            return false;
        }
        if (message.empty()) {
            cerr << "Commit message cannot be empty.\n";
            return false;
        }
        if (!loadIndex()) {
            cerr << "Could not read staging index.\n";
            return false;
        }
        if (stagedFiles.empty()) {
            cout << "Nothing staged. Use: minigit add <file>\n";
            return false;
        }

        string time = currentTime();
        ostringstream data;
        data << message << time;
        for (const auto& item : stagedFiles) {
            data << item.hash << item.filename;
        }

        string id = FileObject::makeHash(data.str());
        Commit commit(id, message, time, stagedFiles);
        if (!commit.save(commitsDirectory)) {
            cerr << "Could not save commit.\n";
            return false;
        }

        // Clear the staging area after a successful commit.
        stagedFiles.clear();
        if (!saveIndex()) {
            cerr << "Commit saved, but staging index could not be cleared.\n";
            return false;
        }

        cout << "Committed " << id << " - " << message << '\n';
        return true;
    }

    bool showHistory() const {
        if (!isInitialized()) {
            cerr << "Repository not initialized. Run: minigit init\n";
            return false;
        }

        bool found = false;
        for (const auto& entry : fs::directory_iterator(commitsDirectory)) {
            if (!entry.is_regular_file() || entry.path().extension() != ".commit") continue;
            ifstream file(entry.path());
            if (!file) continue;
            cout << file.rdbuf() << "-----------------------------\n";
            found = true;
        }

        if (!found) cout << "No commits yet.\n";
        return true;
    }
};

// Abstract base class: all commands promise to provide execute().
class Command {
public:
    virtual bool execute(Repository& repository,
                         const vector<string>& arguments) = 0;
    virtual ~Command() = default; // Virtual destructor for safe polymorphic use.
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
        if (arguments.size() != 1) {
            cerr << "Usage: minigit add <filename>\n";
            return false;
        }
        return repository.addFile(arguments[0]);
    }
};

class CommitCommand : public Command {
public:
    bool execute(Repository& repository, const vector<string>& arguments) override {
        if (arguments.size() != 1) {
            cerr << "Usage: minigit commit -m \"message\"\n";
            return false;
        }
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
        cout << "Mini Git commands:\n"
             << "  ./minigit init\n"
             << "  ./minigit add <filename>\n"
             << "  ./minigit commit -m \"message\"\n"
             << "  ./minigit log\n";
        return 0;
    }

    string action = argv[1];
    vector<string> arguments;

    unique_ptr<Command> command;
    if (action == "init") {
        command = make_unique<InitCommand>();
    } else if (action == "add") {
        command = make_unique<AddCommand>();
        if (argc >= 3) arguments.push_back(argv[2]);
    } else if (action == "commit") {
        command = make_unique<CommitCommand>();
        if (argc >= 4 && string(argv[2]) == "-m") {
            arguments.push_back(argv[3]);
        }
    } else if (action == "log") {
        command = make_unique<LogCommand>();
    } else {
        cerr << "Unknown command: " << action << '\n';
        return 1;
    }

    Repository repository;
    return command->execute(repository, arguments) ? 0 : 1;
}
