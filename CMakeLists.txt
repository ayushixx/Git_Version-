cmake_minimum_required(VERSION 3.14)
project(MiniGitOOP VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(minigit mini_git_oop.cpp)

# Compiler warnings
if (MSVC)
    target_compile_options(minigit PRIVATE /W4)
else()
    target_compile_options(minigit PRIVATE -Wall -Wextra -Wpedantic)
endif()
