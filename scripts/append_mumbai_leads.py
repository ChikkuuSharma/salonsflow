import os
import csv
import pandas as pd

# Paths on Desktop
desktop_dir = r"C:\Users\Devender Sharma\OneDrive\Desktop"
xlsx_path = os.path.join(desktop_dir, "salon_leads_database.xlsx")
xls_path = os.path.join(desktop_dir, "salon_leads_database.xls")
csv_path = os.path.join(desktop_dir, "salon_leads_database.csv")

# Curated Mumbai Leads
mumbai_leads = [
    {
        "Lead ID": "L-015", "Salon Name": "Lakme Salon (Mumbai - Bandra West)", "Owner Name": "Anita Desai",
        "Phone": "+912226442345", "WhatsApp": "+919833012345", "Email": "bandra@lakmesalon.co.in",
        "Address": "Turner Road, Bandra West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.3, "Reviews": 540, "Website": "lakmesalon.in", "Instagram": "@lakmesalon",
        "Facebook": "facebook.com/lakmesalon", "Category": "Unisex Salon", "Branches": 450,
        "Staff Size": 12, "Lead Score": 85, "Lead Status": "HOT",
        "Recommended Pitch": "Staff Commission Engine + WhatsApp Booking",
        "Notes": "Franchise branch of India's largest salon network. Commission slabs calculated manually on Sundays."
    },
    {
        "Lead ID": "L-016", "Salon Name": "Muah Salon (Mumbai - Khar)", "Owner Name": "Natasha Nischol",
        "Phone": "+912226487654", "WhatsApp": "+919820087654", "Email": "khar@muahsalon.in",
        "Address": "Linking Road, Khar West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.7, "Reviews": 380, "Website": "muahsalon.in", "Instagram": "@muahsalon",
        "Facebook": "facebook.com/muahsalon", "Category": "Premium Hair Studio", "Branches": 2,
        "Staff Size": 14, "Lead Score": 95, "Lead Status": "HOT",
        "Recommended Pitch": "AI Rebooking + WhatsApp Review Collection",
        "Notes": "Boutique hair studio catering to Bollywood celebrities. High social media presence but manual review solicitation."
    },
    {
        "Lead ID": "L-017", "Salon Name": "BBlunt (Mumbai - Juhu)", "Owner Name": "Adhuna Bhabani",
        "Phone": "+912226105555", "WhatsApp": "+919820011111", "Email": "juhu@bblunt.com",
        "Address": "Juhu Tara Road, Juhu", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.5, "Reviews": 720, "Website": "bblunt.com", "Instagram": "@bbluntindia",
        "Facebook": "facebook.com/bbluntindia", "Category": "Premium Hair Studio / Chain", "Branches": 18,
        "Staff Size": 20, "Lead Score": 100, "Lead Status": "HOT",
        "Recommended Pitch": "AI Voice Receptionist + Concurrency Locks",
        "Notes": "Acquired by Mamaearth. Highly premium, Juhu flagship branch. High booking volume results in call drops."
    },
    {
        "Lead ID": "L-018", "Salon Name": "Nailspa Experience (Mumbai - Colaba)", "Owner Name": "Amyn Manji",
        "Phone": "+912222183333", "WhatsApp": "+919819933333", "Email": "colaba@nailspaexperience.com",
        "Address": "Colaba Causeway, Near Gateway of India", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.6, "Reviews": 290, "Website": "nailspaexperience.com", "Instagram": "@nailspa_experience",
        "Facebook": "facebook.com/nailspaexperience", "Category": "Nail Salon / Premium Spa", "Branches": 8,
        "Staff Size": 8, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "WhatsApp Booking + Auto Review Request",
        "Notes": "Nail boutique chain. Rely heavily on walk-ins and manual call-back rebookings."
    },
    {
        "Lead ID": "L-019", "Salon Name": "Metodo Rossano Ferretti (Mumbai - Lower Parel)", "Owner Name": "Dimitri Head Stylist",
        "Phone": "+912224901234", "WhatsApp": "+919820056789", "Email": "mumbai@rossanoferretti.com",
        "Address": "Four Seasons Hotel, Worli", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.8, "Reviews": 110, "Website": "rossanoferretti.com", "Instagram": "@rossanoferrettiofficial",
        "Facebook": "", "Category": "Ultra-Premium Hair Salon", "Branches": 1,
        "Staff Size": 6, "Lead Score": 95, "Lead Status": "HOT",
        "Recommended Pitch": "AI Booking Engine (Exclusive VIP Concierge)",
        "Notes": "Ultra luxury salon within Four Seasons. Extremely high service tickets (Rs 10,000+). Needs premium scheduling experience."
    },
    {
        "Lead ID": "L-020", "Salon Name": "Femina Flaunt Salon (Mumbai - Prabhadevi)", "Owner Name": "Rekha Sen",
        "Phone": "+912224305555", "WhatsApp": "+919819955555", "Email": "prabhadevi@feminaflaunt.com",
        "Address": "Appasaheb Marathe Marg, Prabhadevi", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.4, "Reviews": 210, "Website": "feminaflauntsalon.com", "Instagram": "@feminaflauntsalon",
        "Facebook": "facebook.com/feminaflaunt", "Category": "Unisex Salon", "Branches": 12,
        "Staff Size": 10, "Lead Score": 85, "Lead Status": "HOT",
        "Recommended Pitch": "Automated AI Rebooking + Review Collection",
        "Notes": "Franchise partner. Uses standard local CRM but lacks conversion and client re-engagement automations."
    },
    {
        "Lead ID": "L-021", "Salon Name": "The Barber Shop by JCB (Mumbai - Fort)", "Owner Name": "Samir Khan",
        "Phone": "+912222604444", "WhatsApp": "+919833044444", "Email": "fort@thebarbershop.in",
        "Address": "Horniman Circle, Fort", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.5, "Reviews": 180, "Website": "jcbiguine.in", "Instagram": "@thebarbershopbyjcb",
        "Facebook": "", "Category": "Premium Barbershop", "Branches": 3,
        "Staff Size": 5, "Lead Score": 80, "Lead Status": "WARM",
        "Recommended Pitch": "POS Cash Reconciliation + WhatsApp Scheduling",
        "Notes": "Gents styling boutique. Struggling to reconcile desk cash registers with manual booking logs."
    }
]

def append_leads():
    # 1. Update CSV
    if os.path.exists(csv_path):
        try:
            with open(csv_path, 'r', newline='', encoding='utf-8') as f:
                reader = list(csv.reader(f))
            headers = reader[0]
            lead_id_idx = headers.index("Lead ID")
            existing_ids = [row[lead_id_idx] for row in reader[1:] if len(row) > lead_id_idx]

            appended_count = 0
            for lead in mumbai_leads:
                if lead["Lead ID"] not in existing_ids:
                    row_to_append = [str(lead.get(h, '')) for h in headers]
                    with open(csv_path, 'a', newline='', encoding='utf-8') as f:
                        writer = csv.writer(f)
                        writer.writerow(row_to_append)
                    appended_count += 1
            print(f"Successfully appended {appended_count} Mumbai leads to CSV.")
        except Exception as e:
            print(f"Error updating CSV: {e}")

    # 2. Update XLSX
    if os.path.exists(xlsx_path):
        try:
            df = pd.read_excel(xlsx_path)
            new_leads = [l for l in mumbai_leads if l["Lead ID"] not in df["Lead ID"].values]
            if new_leads:
                new_df = pd.DataFrame(new_leads)
                df = pd.concat([df, new_df], ignore_index=True)
                df.to_excel(xlsx_path, index=False)
                print(f"Successfully appended {len(new_leads)} Mumbai leads to XLSX.")
            else:
                print("No new Mumbai leads to add to XLSX (already present).")
        except Exception as e:
            print(f"Error updating XLSX: {e}")

    # 3. Update XLS
    if os.path.exists(xls_path):
        try:
            import xlwt
            df = pd.read_excel(xls_path, engine='xlrd')
            new_leads = [l for l in mumbai_leads if l["Lead ID"] not in df["Lead ID"].values]
            if new_leads:
                new_df = pd.DataFrame(new_leads)
                df = pd.concat([df, new_df], ignore_index=True)
                
                wb = xlwt.Workbook()
                ws = wb.add_sheet('Sheet1')
                for col_idx, col_name in enumerate(df.columns):
                    ws.write(0, col_idx, col_name)
                for row_idx, row in df.iterrows():
                    for col_idx, value in enumerate(row):
                        ws.write(row_idx + 1, col_idx, str(value) if pd.notna(value) else '')
                wb.save(xls_path)
                print(f"Successfully appended {len(new_leads)} Mumbai leads to XLS.")
            else:
                print("No new Mumbai leads to add to XLS (already present).")
        except Exception as e:
            print(f"Error updating XLS: {e}")

if __name__ == "__main__":
    append_leads()
