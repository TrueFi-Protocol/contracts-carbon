from json import load
import os

if __name__ == "__main__":
    if not os.path.exists("build/fuzzing/"):
        os.mkdir("build/fuzzing/")

    with open("fuzzing/scripts/targets.json", 'r') as file:
        targets = load(file)
    
    for invariantsName, setupPath in targets.items():
        setupName = setupPath.split("/")[-1].split(".")[0]

        baseName = f"{invariantsName}_{setupName}"
        txLogPath = f"build/fuzzing/{baseName}.log"
        fuzzingInitPath = f"build/fuzzing/{baseName}"
        configPath = f"build/fuzzing/{baseName}.yaml"

        os.system(f"TX_LOG_FILE={txLogPath} pnpm mocha {setupPath}")

        with open(txLogPath, 'r') as file:
          text = "["+file.read().replace('}\n{', '},\n{')+"]"
        
        with open(fuzzingInitPath, 'w') as file:
          file.write(text)
