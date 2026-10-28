CXX = clang++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2
TARGET = minigit
SRC = mini_git_oop.cpp

all: $(TARGET)

$(TARGET): $(SRC)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(SRC)

test: $(TARGET)
	@echo "=== Running Mini Git Test Suite ==="
	@rm -rf .minigit test_file.txt
	@echo "1. Testing initialization..."
	./$(TARGET) init
	@echo "2. Creating test file and testing staging..."
	@echo "Hello MiniGit OOP!" > test_file.txt
	./$(TARGET) add test_file.txt
	@echo "3. Testing commit..."
	./$(TARGET) commit -m "Initial automated test commit"
	@echo "4. Testing log..."
	./$(TARGET) log
	@rm -rf .minigit test_file.txt
	@echo "=== All Tests Passed! ==="

clean:
	rm -rf $(TARGET) .minigit *.o

.PHONY: all test clean
