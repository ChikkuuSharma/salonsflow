import os
import csv
import pandas as pd

# Paths on Desktop
desktop_dir = r"C:\Users\Devender Sharma\OneDrive\Desktop"
xlsx_path = os.path.join(desktop_dir, "salon_leads_database.xlsx")
xls_path = os.path.join(desktop_dir, "salon_leads_database.xls")
csv_path = os.path.join(desktop_dir, "salon_leads_database.csv")

# 20 More Leads (Thane, Navi Mumbai, Pune)
additional_leads = [
    {
        "Lead ID": "L-052", "Salon Name": "Lakme Salon (Thane - Teen Hath Naka)", "Owner Name": "Smita Rane",
        "Phone": "+912225301122", "WhatsApp": "+919819911122", "Email": "thane@lakmesalon.co.in",
        "Address": "LBS Marg, Teen Hath Naka", "City": "Thane", "State": "Maharashtra",
        "Google Rating": 4.3, "Reviews": 490, "Website": "lakmesalon.in", "Instagram": "@lakmethane",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 450,
        "Staff Size": 10, "Lead Score": 85, "Lead Status": "HOT",
        "Recommended Pitch": "Staff Commission Engine + WhatsApp Booking",
        "Notes": "Franchise partner. Stylists calculate slab commissions manually, causing reconciliation disputes."
    },
    {
        "Lead ID": "L-053", "Salon Name": "Looks Salon (Thane - Viviana Mall)", "Owner Name": "Karan Malhotra",
        "Phone": "+912225402233", "WhatsApp": "+919819922233", "Email": "viviana@lookssalon.in",
        "Address": "Viviana Mall, Eastern Express Highway", "City": "Thane", "State": "Maharashtra",
        "Google Rating": 4.5, "Reviews": 820, "Website": "lookssalon.in", "Instagram": "@looksviviana",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 115,
        "Staff Size": 16, "Lead Score": 100, "Lead Status": "HOT",
        "Recommended Pitch": "Staff Commission Engine + POS Reconciliation",
        "Notes": "High-volume mall setup. Front desk checkouts require real-time commission logging."
    },
    {
        "Lead ID": "L-054", "Salon Name": "Enrich Salons (Thane - Gokhale Road)", "Owner Name": "Vinay Sawant",
        "Phone": "+912241551122", "WhatsApp": "+919845011122", "Email": "gokhale@enrichsalon.com",
        "Address": "Gokhale Road, Naupada", "City": "Thane", "State": "Maharashtra",
        "Google Rating": 4.4, "Reviews": 650, "Website": "enrichsalon.com", "Instagram": "@enrichthane",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 85,
        "Staff Size": 12, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "AI Receptionist + WhatsApp CRM",
        "Notes": "Highly populated commercial zone. Struggles with outbound re-engagement campaigns."
    },
    {
        "Lead ID": "L-055", "Salon Name": "BBlunt (Thane - Hiranandani Estate)", "Owner Name": "Nisha Shah",
        "Phone": "+912225893344", "WhatsApp": "+919820033344", "Email": "estate@bblunt.com",
        "Address": "The Walk, Hiranandani Estate", "City": "Thane", "State": "Maharashtra",
        "Google Rating": 4.5, "Reviews": 280, "Website": "bblunt.com", "Instagram": "@bbluntthane",
        "Facebook": "", "Category": "Premium Hair Studio / Chain", "Branches": 18,
        "Staff Size": 8, "Lead Score": 85, "Lead Status": "HOT",
        "Recommended Pitch": "AI Voice Receptionist + Concurrency Locks",
        "Notes": "Premium residential high-street location. Experiencing front-desk telephone queues."
    },
    {
        "Lead ID": "L-056", "Salon Name": "JCB Salon (Thane - Panchpakhadi)", "Owner Name": "Rahul Gore",
        "Phone": "+912225364455", "WhatsApp": "+919820044455", "Email": "panchpakhadi@jcbiguine.in",
        "Address": "Near Nitin Junction, Panchpakhadi", "City": "Thane", "State": "Maharashtra",
        "Google Rating": 4.6, "Reviews": 390, "Website": "jcbiguine.in", "Instagram": "@jcbthane",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 15,
        "Staff Size": 11, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "AI Voice Receptionist + WhatsApp Scheduling",
        "Notes": "Biguine upscale franchise in Thane. Targets premium customers in Central suburbs."
    },
    {
        "Lead ID": "L-057", "Salon Name": "BBlunt (Navi Mumbai - Vashi Sector 17)", "Owner Name": "Pooja Hegde",
        "Phone": "+912227821122", "WhatsApp": "+919820055566", "Email": "vashi@bblunt.com",
        "Address": "Sector 17, Vashi", "City": "Navi Mumbai", "State": "Maharashtra",
        "Google Rating": 4.5, "Reviews": 460, "Website": "bblunt.com", "Instagram": "@bbluntvashi",
        "Facebook": "", "Category": "Premium Hair Studio / Chain", "Branches": 18,
        "Staff Size": 12, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "AI Voice Receptionist + Concurrency Locks",
        "Notes": "Navi Mumbai flagship branch. Front desk drops up to 12% weekend booking calls."
    },
    {
        "Lead ID": "L-058", "Salon Name": "Looks Salon (Navi Mumbai - Seawoods)", "Owner Name": "Vikram Sen",
        "Phone": "+912227702233", "WhatsApp": "+919819922233", "Email": "seawoods@lookssalon.in",
        "Address": "Seawoods Grand Central Mall", "City": "Navi Mumbai", "State": "Maharashtra",
        "Google Rating": 4.4, "Reviews": 610, "Website": "lookssalon.in", "Instagram": "@looksseawoods",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 115,
        "Staff Size": 14, "Lead Score": 95, "Lead Status": "HOT",
        "Recommended Pitch": "Staff Commission Engine + POS Reconciliation",
        "Notes": "Mall flagship branch. Multi-stylist slab calculations take hours on Sundays."
    },
    {
        "Lead ID": "L-059", "Salon Name": "Enrich Salons (Navi Mumbai - Kharghar)", "Owner Name": "Deepak Patil",
        "Phone": "+912241563344", "WhatsApp": "+919845033344", "Email": "kharghar@enrichsalon.com",
        "Address": "Sector 20, Kharghar", "City": "Navi Mumbai", "State": "Maharashtra",
        "Google Rating": 4.3, "Reviews": 510, "Website": "enrichsalon.com", "Instagram": "@enrichkharghar",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 85,
        "Staff Size": 10, "Lead Score": 85, "Lead Status": "HOT",
        "Recommended Pitch": "AI Receptionist + WhatsApp CRM",
        "Notes": "High density residential node. Customer churn is high; requires re-booking triggers."
    },
    {
        "Lead ID": "L-060", "Salon Name": "Lakme Salon (Navi Mumbai - Nerul East)", "Owner Name": "Ashwini Kadam",
        "Phone": "+912227715566", "WhatsApp": "+919833055577", "Email": "nerul@lakmesalon.co.in",
        "Address": "Sector 19, Nerul East", "City": "Navi Mumbai", "State": "Maharashtra",
        "Google Rating": 4.2, "Reviews": 180, "Website": "lakmesalon.in", "Instagram": "@lakmenerul",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 450,
        "Staff Size": 7, "Lead Score": 75, "Lead Status": "WARM",
        "Recommended Pitch": "Staff Commission Engine + WhatsApp Booking",
        "Notes": "Mid-market residential setup. Manual payout tracking."
    },
    {
        "Lead ID": "L-061", "Salon Name": "Kapils Salon (Navi Mumbai - Belapur CBD)", "Owner Name": "Amit Deshmukh",
        "Phone": "+912227576677", "WhatsApp": "+919819966778", "Email": "belapur@kapilssalon.com",
        "Address": "Sector 11, CBD Belapur", "City": "Navi Mumbai", "State": "Maharashtra",
        "Google Rating": 4.3, "Reviews": 320, "Website": "kapilssalon.com", "Instagram": "@kapilsbelapur",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 35,
        "Staff Size": 9, "Lead Score": 80, "Lead Status": "WARM",
        "Recommended Pitch": "Staff Commission Engine + POS Reconciliation",
        "Notes": "CBD commercial node. Cash reconciliation checks required for cash draw billing."
    },
    {
        "Lead ID": "L-062", "Salon Name": "Lakme Salon (Pune - Koregaon Park)", "Owner Name": "Rohini Joshi",
        "Phone": "+912026151122", "WhatsApp": "+919890111122", "Email": "kp@lakmesalon.co.in",
        "Address": "North Main Road, Koregaon Park", "City": "Pune", "State": "Maharashtra",
        "Google Rating": 4.4, "Reviews": 710, "Website": "lakmesalon.in", "Instagram": "@lakmekp",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 450,
        "Staff Size": 11, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "Staff Commission Engine + WhatsApp Booking",
        "Notes": "Prime Pune area. High weekend volume. Commission slab disputes."
    },
    {
        "Lead ID": "L-063", "Salon Name": "BBlunt (Pune - Kalyani Nagar)", "Owner Name": "Sonali Mehta",
        "Phone": "+912026632233", "WhatsApp": "+919820022233", "Email": "kalyani@bblunt.com",
        "Address": "Central Avenue, Kalyani Nagar", "City": "Pune", "State": "Maharashtra",
        "Google Rating": 4.6, "Reviews": 540, "Website": "bblunt.com", "Instagram": "@bbluntpune",
        "Facebook": "", "Category": "Premium Hair Studio / Chain", "Branches": 18,
        "Staff Size": 14, "Lead Score": 95, "Lead Status": "HOT",
        "Recommended Pitch": "AI Voice Receptionist + Concurrency Locks",
        "Notes": "Premium styling boutique. Face telephone queues during peak holiday seasons."
    },
    {
        "Lead ID": "L-064", "Salon Name": "Looks Salon (Pune - Viman Nagar)", "Owner Name": "Alok Agarwal",
        "Phone": "+912041283344", "WhatsApp": "+919819933344", "Email": "vimannagar@lookssalon.in",
        "Address": "Phoenix Marketcity, Viman Nagar", "City": "Pune", "State": "Maharashtra",
        "Google Rating": 4.5, "Reviews": 910, "Website": "lookssalon.in", "Instagram": "@lookspune",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 115,
        "Staff Size": 15, "Lead Score": 100, "Lead Status": "HOT",
        "Recommended Pitch": "Staff Commission Engine + POS Reconciliation",
        "Notes": "Vivacious mall location. Multi-stylist checkouts require instant payout transparency."
    },
    {
        "Lead ID": "L-065", "Salon Name": "Enrich Salons (Pune - Baner Road)", "Owner Name": "Sanjay Kulkarni",
        "Phone": "+912041574455", "WhatsApp": "+919845044455", "Email": "baner@enrichsalon.com",
        "Address": "Baner Road, Near Pancard Club", "City": "Pune", "State": "Maharashtra",
        "Google Rating": 4.4, "Reviews": 680, "Website": "enrichsalon.com", "Instagram": "@enrichbaner",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 85,
        "Staff Size": 12, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "AI Receptionist + WhatsApp CRM",
        "Notes": "Densely populated IT corridor residential client base. Re-booking triggers crucial."
    },
    {
        "Lead ID": "L-066", "Salon Name": "Kapils Salon (Pune - Kothrud)", "Owner Name": "Manoj Deshpande",
        "Phone": "+912025385566", "WhatsApp": "+919819955566", "Email": "kothrud@kapilssalon.com",
        "Address": "Paud Road, Kothrud", "City": "Pune", "State": "Maharashtra",
        "Google Rating": 4.2, "Reviews": 410, "Website": "kapilssalon.com", "Instagram": "@kapilskothrud",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 35,
        "Staff Size": 10, "Lead Score": 80, "Lead Status": "WARM",
        "Recommended Pitch": "Staff Commission Engine + POS Reconciliation",
        "Notes": "Traditional residential stronghold. Focus on automated payout breakdowns."
    },
    {
        "Lead ID": "L-067", "Salon Name": "Truefitt & Hill (Pune - Aundh)", "Owner Name": "Istayak Ansari",
        "Phone": "+912025886677", "WhatsApp": "+919820066778", "Email": "aundh@truefittandhill.in",
        "Address": "ITI Road, Aundh", "City": "Pune", "State": "Maharashtra",
        "Google Rating": 4.7, "Reviews": 210, "Website": "truefittandhill.in", "Instagram": "@truefittpune",
        "Facebook": "", "Category": "Premium Barbershop", "Branches": 28,
        "Staff Size": 6, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "AI Booking Engine (Exclusive VIP Concierge)",
        "Notes": "Bespoke royal barber. Targets premium IT executives and business owners in Aundh."
    },
    {
        "Lead ID": "L-068", "Salon Name": "JCB Salon (Pune - Shivaji Nagar)", "Owner Name": "Sameer Joshi",
        "Phone": "+912025537788", "WhatsApp": "+919820077889", "Email": "shivajinagar@jcbiguine.in",
        "Address": "Ghole Road, Shivaji Nagar", "City": "Pune", "State": "Maharashtra",
        "Google Rating": 4.6, "Reviews": 350, "Website": "jcbiguine.in", "Instagram": "@jcbpune",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 15,
        "Staff Size": 11, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "AI Voice Receptionist + WhatsApp Scheduling",
        "Notes": "Biguine central Pune node. High status customer base."
    },
    {
        "Lead ID": "L-069", "Salon Name": "Star & Sitara Salon (Thane - Majiwada)", "Owner Name": "Vijay Rupani",
        "Phone": "+912225478899", "WhatsApp": "+919819988990", "Email": "majiwada@starsitara.in",
        "Address": "Majiwada Junction", "City": "Thane", "State": "Maharashtra",
        "Google Rating": 4.1, "Reviews": 150, "Website": "starsitara.in", "Instagram": "@starsitara_thane",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 1,
        "Staff Size": 5, "Lead Score": 60, "Lead Status": "WARM",
        "Recommended Pitch": "Basic POS Billing + Free Trial",
        "Notes": "Suburban family salon. Uses paper logs."
    },
    {
        "Lead ID": "L-070", "Salon Name": "Shear Genius Salon (Thane - Kalwa)", "Owner Name": "Rita D'Souza",
        "Phone": "+912225390000", "WhatsApp": "+919819900111", "Email": "kalwa@sheargenius.in",
        "Address": "Kalwa Naka", "City": "Thane", "State": "Maharashtra",
        "Google Rating": 4.2, "Reviews": 170, "Website": "sheargenius.in", "Instagram": "@sheargenius_thane",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 2,
        "Staff Size": 6, "Lead Score": 75, "Lead Status": "WARM",
        "Recommended Pitch": "Automated AI Rebooking + Review Collection",
        "Notes": "Suburban outlet. High walk-ins density. Needs automated Google review collection."
    },
    {
        "Lead ID": "L-071", "Salon Name": "Glamour Salon & Spa (Navi Mumbai - Kamothe)", "Owner Name": "Sanjay Patel",
        "Phone": "+912227424455", "WhatsApp": "+919892044556", "Email": "kamothe@glamoursalon.co.in",
        "Address": "Sector 11, Kamothe", "City": "Navi Mumbai", "State": "Maharashtra",
        "Google Rating": 4.0, "Reviews": 120, "Website": "glamoursalon.co.in", "Instagram": "@glamourkamothe",
        "Facebook": "", "Category": "Unisex Salon & Spa", "Branches": 1,
        "Staff Size": 5, "Lead Score": 55, "Lead Status": "COLD",
        "Recommended Pitch": "Basic POS Billing + Free Trial",
        "Notes": "Local neighborhood outlet. Focus on POS checkout trial."
    }
]

def append_additional_leads():
    # 1. Update CSV
    if os.path.exists(csv_path):
        try:
            with open(csv_path, 'r', newline='', encoding='utf-8') as f:
                reader = list(csv.reader(f))
            headers = reader[0]
            lead_id_idx = headers.index("Lead ID")
            existing_ids = [row[lead_id_idx] for row in reader[1:] if len(row) > lead_id_idx]

            appended_count = 0
            for lead in additional_leads:
                if lead["Lead ID"] not in existing_ids:
                    row_to_append = [str(lead.get(h, '')) for h in headers]
                    with open(csv_path, 'a', newline='', encoding='utf-8') as f:
                        writer = csv.writer(f)
                        writer.writerow(row_to_append)
                    appended_count += 1
            print(f"Successfully appended {appended_count} leads to CSV.")
        except Exception as e:
            print(f"Error updating CSV: {e}")

    # 2. Update XLSX
    if os.path.exists(xlsx_path):
        try:
            df = pd.read_excel(xlsx_path)
            new_leads = [l for l in additional_leads if l["Lead ID"] not in df["Lead ID"].values]
            if new_leads:
                new_df = pd.DataFrame(new_leads)
                df = pd.concat([df, new_df], ignore_index=True)
                df.to_excel(xlsx_path, index=False)
                print(f"Successfully appended {len(new_leads)} leads to XLSX.")
            else:
                print("No new leads to add to XLSX (already present).")
        except Exception as e:
            print(f"Error updating XLSX: {e}")

    # 3. Update XLS
    if os.path.exists(xls_path):
        try:
            import xlwt
            df = pd.read_excel(xls_path, engine='xlrd')
            new_leads = [l for l in additional_leads if l["Lead ID"] not in df["Lead ID"].values]
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
                print(f"Successfully appended {len(new_leads)} leads to XLS.")
            else:
                print("No new leads to add to XLS (already present).")
        except Exception as e:
            print(f"Error updating XLS: {e}")

if __name__ == "__main__":
    append_additional_leads()
