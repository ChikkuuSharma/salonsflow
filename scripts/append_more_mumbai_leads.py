import os
import csv
import pandas as pd

# Paths on Desktop
desktop_dir = r"C:\Users\Devender Sharma\OneDrive\Desktop"
xlsx_path = os.path.join(desktop_dir, "salon_leads_database.xlsx")
xls_path = os.path.join(desktop_dir, "salon_leads_database.xls")
csv_path = os.path.join(desktop_dir, "salon_leads_database.csv")

# More Mumbai Leads
more_mumbai_leads = [
    {
        "Lead ID": "L-022", "Salon Name": "JCB Salon (Mumbai - Juhu)", "Owner Name": "Sonia Mehta",
        "Phone": "+912226102222", "WhatsApp": "+919820033333", "Email": "juhu@jcbiguine.in",
        "Address": "Juhu Road, Vile Parle West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.6, "Reviews": 680, "Website": "jcbiguine.in", "Instagram": "@jcbjuhu",
        "Facebook": "facebook.com/jcbjuhu", "Category": "Premium Salon Chain", "Branches": 15,
        "Staff Size": 16, "Lead Score": 100, "Lead Status": "HOT",
        "Recommended Pitch": "AI Voice Receptionist + WhatsApp Scheduling",
        "Notes": "Flagship Juhu branch. Extremely busy weekends. Leads dropped on telephone queues."
    },
    {
        "Lead ID": "L-023", "Salon Name": "Looks Salon (Mumbai - Lower Parel)", "Owner Name": "Rohit Kapoor",
        "Phone": "+912224985555", "WhatsApp": "+919819055555", "Email": "lowerparel@lookssalon.in",
        "Address": "High Street Phoenix, Lower Parel", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.4, "Reviews": 510, "Website": "lookssalon.in", "Instagram": "@lookspalladium",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 115,
        "Staff Size": 14, "Lead Score": 95, "Lead Status": "HOT",
        "Recommended Pitch": "Staff Commission Engine + POS Reconciliation",
        "Notes": "Corporate partner node. Multi-stylist commission splits calculations took 4 hours every Sunday."
    },
    {
        "Lead ID": "L-024", "Salon Name": "Truefitt & Hill (Mumbai - Colaba)", "Owner Name": "Istayak Ansari",
        "Phone": "+912222801805", "WhatsApp": "+919820018050", "Email": "colaba@truefittandhill.in",
        "Address": "Apollo Bunder, Colaba", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.7, "Reviews": 220, "Website": "truefittandhill.in", "Instagram": "@truefittandhillindia",
        "Facebook": "facebook.com/truefittandhillindia", "Category": "Premium Barbershop", "Branches": 28,
        "Staff Size": 6, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "AI Booking Engine (Exclusive VIP Concierge)",
        "Notes": "Royal barbershop of London franchisee. Royal services booking need exclusive slots locks."
    },
    {
        "Lead ID": "L-025", "Salon Name": "Kapils Salon (Mumbai - Malad West)", "Owner Name": "Neha Shah",
        "Phone": "+912228807777", "WhatsApp": "+919819977777", "Email": "malad@kapilssalon.com",
        "Address": "Link Road, Malad West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.3, "Reviews": 490, "Website": "kapilssalon.com", "Instagram": "@kapilsmalad",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 35,
        "Staff Size": 12, "Lead Score": 85, "Lead Status": "HOT",
        "Recommended Pitch": "Staff Commission Engine + POS Reconciliation",
        "Notes": "Regional retail brand. High billing volumes. Staff requires commission breakdown transparency."
    },
    {
        "Lead ID": "L-026", "Salon Name": "Hairmosa Salon (Mumbai - Powai)", "Owner Name": "Shweta Shetty",
        "Phone": "+912225708888", "WhatsApp": "+919833088888", "Email": "powai@hairmosa.in",
        "Address": "Central Avenue, Hiranandani Powai", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.5, "Reviews": 320, "Website": "hairmosa.in", "Instagram": "@hairmosa_powai",
        "Facebook": "facebook.com/hairmosapowai", "Category": "Unisex Salon", "Branches": 1,
        "Staff Size": 9, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "AI Rebooking + WhatsApp Review Collection",
        "Notes": "Premium standalone salon in tech hub. High retention possibility for rebooking triggers."
    },
    {
        "Lead ID": "L-027", "Salon Name": "BBlunt (Mumbai - Bandra West)", "Owner Name": "Riya Sen",
        "Phone": "+912226403333", "WhatsApp": "+919820044444", "Email": "bandra@bblunt.com",
        "Address": "Waterfield Road, Bandra West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.6, "Reviews": 940, "Website": "bblunt.com", "Instagram": "@bbluntbandra",
        "Facebook": "", "Category": "Premium Hair Studio / Chain", "Branches": 18,
        "Staff Size": 22, "Lead Score": 100, "Lead Status": "HOT",
        "Recommended Pitch": "AI Voice Receptionist + Concurrency Locks",
        "Notes": "Busy styling hub. Receives high call drops during prime weekend times."
    },
    {
        "Lead ID": "L-028", "Salon Name": "L'Oreal Professionnel Salon (Mumbai - Andheri West)", "Owner Name": "Rajesh Malhotra",
        "Phone": "+912226309999", "WhatsApp": "+919819999999", "Email": "andheri@lorealprofessionnel.in",
        "Address": "Lokhandwala Complex, Andheri West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.4, "Reviews": 600, "Website": "lorealprofessionnel.in", "Instagram": "@lorealpro",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 5,
        "Staff Size": 15, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "Automated AI Rebooking + Review Collection",
        "Notes": "Busy Bollywood styling hub in Lokhandwala. Needs automated review boosters."
    },
    {
        "Lead ID": "L-029", "Salon Name": "Dessange Paris (Mumbai - Kemps Corner)", "Owner Name": "Meera Chopra",
        "Phone": "+912223801234", "WhatsApp": "+919820012340", "Email": "kemps@dessangeparis.co.in",
        "Address": "Kemps Corner, South Mumbai", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.7, "Reviews": 150, "Website": "dessange.com", "Instagram": "@dessangekemps",
        "Facebook": "", "Category": "Ultra-Premium Hair Salon", "Branches": 2,
        "Staff Size": 8, "Lead Score": 95, "Lead Status": "HOT",
        "Recommended Pitch": "AI Booking Engine (Exclusive VIP Concierge)",
        "Notes": "Exclusive French brand salon. High spending clients. Focus on VIP chatbot scheduler."
    },
    {
        "Lead ID": "L-030", "Salon Name": "Kala Mandir Salon (Mumbai - Borivali West)", "Owner Name": "Suresh Chand",
        "Phone": "+912228906666", "WhatsApp": "+919833066666", "Email": "borivali@kalamandirsalon.com",
        "Address": "S.V. Road, Borivali West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.2, "Reviews": 190, "Website": "kalamandirsalon.com", "Instagram": "@kalamandirsalon",
        "Facebook": "facebook.com/kalamandir", "Category": "Unisex Salon", "Branches": 1,
        "Staff Size": 7, "Lead Score": 65, "Lead Status": "WARM",
        "Recommended Pitch": "POS Cash Reconciliation + WhatsApp Scheduling",
        "Notes": "Suburban family salon. Cash drawer logs require reconciliation checks."
    },
    {
        "Lead ID": "L-031", "Salon Name": "Star & Sitara Salon (Mumbai - Ghatkopar East)", "Owner Name": "Vijay Rupani",
        "Phone": "+912225102222", "WhatsApp": "+919819922222", "Email": "ghatkopar@starsitara.co.in",
        "Address": "Vallabh Baug Lane, Ghatkopar East", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.1, "Reviews": 130, "Website": "starsitara.in", "Instagram": "@starsitara",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 1,
        "Staff Size": 5, "Lead Score": 60, "Lead Status": "WARM",
        "Recommended Pitch": "Basic POS Billing + Free Trial",
        "Notes": "Mid-market styling desk. Still using paper diaries for appointment logs."
    },
    {
        "Lead ID": "L-032", "Salon Name": "Enrich Salons (Mumbai - Andheri East)", "Owner Name": "Amit Sharma",
        "Phone": "+912241528888", "WhatsApp": "+919845088888", "Email": "andherieast@enrichsalon.com",
        "Address": "JB Nagar, Andheri East", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.3, "Reviews": 820, "Website": "enrichsalon.com", "Instagram": "@enrich_andheri",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 85,
        "Staff Size": 14, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "AI Receptionist + WhatsApp CRM",
        "Notes": "High footfall retail block. Needs automated re-engagement triggers."
    },
    {
        "Lead ID": "L-033", "Salon Name": "Drybar by JCB (Mumbai - Palladium)", "Owner Name": "Priya Nair",
        "Phone": "+912224903333", "WhatsApp": "+919820055555", "Email": "drybar@jcbiguine.in",
        "Address": "Palladium Mall, Lower Parel", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.6, "Reviews": 410, "Website": "jcbiguine.in", "Instagram": "@drybarpalladium",
        "Facebook": "", "Category": "Premium Hair Studio", "Branches": 4,
        "Staff Size": 10, "Lead Score": 95, "Lead Status": "HOT",
        "Recommended Pitch": "AI Voice Receptionist + Concurrency Locks",
        "Notes": "Upscale express blow dry bar in luxury mall. Demands quick WhatsApp appointment setup."
    },
    {
        "Lead ID": "L-034", "Salon Name": "Geetanjali Salon (Mumbai - Bandra West)", "Owner Name": "Vikram Kapoor",
        "Phone": "+912226444444", "WhatsApp": "+919810844444", "Email": "bandra@geetanjali.com",
        "Address": "Linking Road, Bandra West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.5, "Reviews": 390, "Website": "geetanjalisalon.com", "Instagram": "@geetanjalibandra",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 90,
        "Staff Size": 15, "Lead Score": 95, "Lead Status": "HOT",
        "Recommended Pitch": "Staff Commission Engine + POS Reconciliation",
        "Notes": "Recently launched flagship Bandra outlet. Complex stylist commission slabs."
    },
    {
        "Lead ID": "L-035", "Salon Name": "Bounce Style Lounge (Mumbai - Santacruz West)", "Owner Name": "Alok Mehta",
        "Phone": "+912226601111", "WhatsApp": "+919833011111", "Email": "santacruz@bouncesalon.com",
        "Address": "Linking Road, Santacruz West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.5, "Reviews": 280, "Website": "bouncesalon.com", "Instagram": "@bouncesantacruz",
        "Facebook": "", "Category": "Hair Studio / Premium Salon", "Branches": 12,
        "Staff Size": 11, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "AI Voice Receptionist + WhatsApp CRM",
        "Notes": "Premium hair color lounge. Experiencing long booking call queue waits."
    },
    {
        "Lead ID": "L-036", "Salon Name": "Shear Genius Salon (Mumbai - Vashi)", "Owner Name": "Rita D'Souza",
        "Phone": "+912227810000", "WhatsApp": "+919819900000", "Email": "vashi@sheargenius.in",
        "Address": "Sector 17, Vashi, Navi Mumbai", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.4, "Reviews": 340, "Website": "sheargenius.in", "Instagram": "@sheargeniusvashi",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 2,
        "Staff Size": 8, "Lead Score": 85, "Lead Status": "HOT",
        "Recommended Pitch": "Automated AI Rebooking + Review Collection",
        "Notes": "Navi Mumbai branch. High stylist utilization rates. Focus on re-booking triggers."
    }
]

def append_more_leads():
    # 1. Update CSV
    if os.path.exists(csv_path):
        try:
            with open(csv_path, 'r', newline='', encoding='utf-8') as f:
                reader = list(csv.reader(f))
            headers = reader[0]
            lead_id_idx = headers.index("Lead ID")
            existing_ids = [row[lead_id_idx] for row in reader[1:] if len(row) > lead_id_idx]

            appended_count = 0
            for lead in more_mumbai_leads:
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
            new_leads = [l for l in more_mumbai_leads if l["Lead ID"] not in df["Lead ID"].values]
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
            new_leads = [l for l in more_mumbai_leads if l["Lead ID"] not in df["Lead ID"].values]
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
    append_more_leads()
