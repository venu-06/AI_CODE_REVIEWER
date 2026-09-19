export const defaultCode = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;

    cout << "Sum = " << a + b << endl;

    return 0;
}`,

  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        int a = sc.nextInt();
        int b = sc.nextInt();

        System.out.println("Sum = " + (a + b));
    }
}`,

  python: `a = int(input())
b = int(input())

print("Sum =", a + b)`,
};

export const languageOptions = [
  { label: "C++", value: "cpp" },
  { label: "Java", value: "java" },
  { label: "Python", value: "python" },
];

export const getFileName = (language) => {
  switch (language) {
    case "cpp":
      return "main.cpp";
    case "java":
      return "Main.java";
    case "python":
      return "main.py";
    default:
      return "main.cpp";
  }
};
