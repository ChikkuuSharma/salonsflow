import subprocess
import os

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
brochure_dir = r"c:\Users\Devender Sharma\.gemini\antigravity\scratch\salonflow\marketing_brochure"
desktop_dir = r"C:\Users\Devender Sharma\OneDrive\Desktop"

def compile_pdf(html_filename, pdf_filename):
    html_file = os.path.join(brochure_dir, html_filename)
    pdf_file = os.path.join(desktop_dir, pdf_filename)
    
    cmd = [
        chrome_path,
        "--headless",
        f"--print-to-pdf={pdf_file}",
        html_file
    ]
    
    print(f"Compiling {html_filename} to {pdf_filename}...")
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(f"Successfully compiled {pdf_filename}!")
        print(f"Bytes written: {os.path.getsize(pdf_file)}")
    except subprocess.CalledProcessError as e:
        print(f"Failed to compile: {e}")
        print(f"Stdout: {e.stdout}")
        print(f"Stderr: {e.stderr}")

def main():
    compile_pdf("pitch_en.html", "SalonFlow_Vendor_Pitch.pdf")
    compile_pdf("pitch_hi.html", "SalonFlow_Vendor_Pitch_Hinglish.pdf")
    compile_pdf("comparison.html", "SalonFlow_Market_Comparison.pdf")

if __name__ == "__main__":
    main()
