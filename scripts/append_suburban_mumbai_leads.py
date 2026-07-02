import os
import csv
import pandas as pd

# Paths on Desktop
desktop_dir = r"C:\Users\Devender Sharma\OneDrive\Desktop"
xlsx_path = os.path.join(desktop_dir, "salon_leads_database.xlsx")
xls_path = os.path.join(desktop_dir, "salon_leads_database.xls")
csv_path = os.path.join(desktop_dir, "salon_leads_database.csv")

# Suburban Mumbai Leads (Malad, Kandivali, Borivali, Dahisar, Mira Road, Bhayander)
suburban_mumbai_leads = [
    {
        "Lead ID": "L-037", "Salon Name": "Lakme Salon (Mumbai - Malad East)", "Owner Name": "Sneha Mehta",
        "Phone": "+912228811122", "WhatsApp": "+919819111122", "Email": "maladeast@lakmesalon.co.in",
        "Address": "Rani Sati Marg, Malad East", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.2, "Reviews": 340, "Website": "lakmesalon.in", "Instagram": "@lakmesalon",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 450,
        "Staff Size": 8, "Lead Score": 80, "Lead Status": "HOT",
        "Recommended Pitch": "Staff Commission Engine + POS Reconciliation",
        "Notes": "Busy suburban residential hub. Payout reconciliation queries on weekends."
    },
    {
        "Lead ID": "L-038", "Salon Name": "Looks Salon (Mumbai - Malad West)", "Owner Name": "Vishal Shah",
        "Phone": "+912228822233", "WhatsApp": "+919819222233", "Email": "maladwest@lookssalon.in",
        "Address": "Inorbit Mall, Malad West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.5, "Reviews": 410, "Website": "lookssalon.in", "Instagram": "@looksinorbit",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 115,
        "Staff Size": 12, "Lead Score": 95, "Lead Status": "HOT",
        "Recommended Pitch": "Staff Commission Engine + POS Reconciliation",
        "Notes": "Mall premium node. Stylists need instant transparency on their commission ledgers."
    },
    {
        "Lead ID": "L-039", "Salon Name": "Enrich Salons (Mumbai - Kandivali West)", "Owner Name": "Manoj Jain",
        "Phone": "+912241530000", "WhatsApp": "+919845030000", "Email": "kandivali@enrichsalon.com",
        "Address": "Mahavir Nagar, Kandivali West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.4, "Reviews": 720, "Website": "enrichsalon.com", "Instagram": "@enrichmahavir",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 85,
        "Staff Size": 15, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "AI Receptionist + WhatsApp CRM",
        "Notes": "Densely populated vegetarian residential block. Relies heavily on weekend reservation slots."
    },
    {
        "Lead ID": "L-040", "Salon Name": "BBlunt (Mumbai - Kandivali East)", "Owner Name": "Alok Sharma",
        "Phone": "+912228844444", "WhatsApp": "+919820055555", "Email": "kandivalieast@bblunt.com",
        "Address": "Thakur Village, Kandivali East", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.5, "Reviews": 310, "Website": "bblunt.com", "Instagram": "@bbluntthakur",
        "Facebook": "", "Category": "Premium Hair Studio / Chain", "Branches": 18,
        "Staff Size": 10, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "AI Voice Receptionist + Concurrency Locks",
        "Notes": "Styling hub. Front desk drops up to 15% calls during Saturday peak times."
    },
    {
        "Lead ID": "L-041", "Salon Name": "JCB Salon (Mumbai - Borivali West)", "Owner Name": "Tina Desai",
        "Phone": "+912228912222", "WhatsApp": "+919820066666", "Email": "borivali@jcbiguine.in",
        "Address": "Shimpoli Road, Borivali West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.6, "Reviews": 530, "Website": "jcbiguine.in", "Instagram": "@jcbborivali",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 15,
        "Staff Size": 14, "Lead Score": 95, "Lead Status": "HOT",
        "Recommended Pitch": "AI Voice Receptionist + WhatsApp Scheduling",
        "Notes": "Biguine flagship branch in Western suburbs. Needs localized Hinglish conversational schedule setup."
    },
    {
        "Lead ID": "L-042", "Salon Name": "Kala Mandir Salon (Mumbai - Borivali East)", "Owner Name": "Amit Chand",
        "Phone": "+912228926666", "WhatsApp": "+919833077777", "Email": "borivalieast@kalamandir.in",
        "Address": "Carter Road, Borivali East", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.1, "Reviews": 140, "Website": "kalamandir.in", "Instagram": "@kalamandir_borivali",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 1,
        "Staff Size": 6, "Lead Score": 60, "Lead Status": "WARM",
        "Recommended Pitch": "POS Cash Reconciliation + WhatsApp Scheduling",
        "Notes": "Traditional salon setup. Owner has high concern over checkout cash drawer leaks."
    },
    {
        "Lead ID": "L-043", "Salon Name": "Shear Genius Salon (Mumbai - Dahisar East)", "Owner Name": "Kiran More",
        "Phone": "+912228280000", "WhatsApp": "+919819911111", "Email": "dahisar@sheargenius.in",
        "Address": "S.V. Road, Near Dahisar Station", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.3, "Reviews": 180, "Website": "sheargenius.in", "Instagram": "@sheargeniusdahisar",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 2,
        "Staff Size": 6, "Lead Score": 80, "Lead Status": "WARM",
        "Recommended Pitch": "Automated AI Rebooking + Review Collection",
        "Notes": "Suburban station node. Relies on fast walk-ins. Low retention tracking."
    },
    {
        "Lead ID": "L-044", "Salon Name": "Enrich Salons (Mumbai - Dahisar West)", "Owner Name": "Hitesh Dave",
        "Phone": "+912241541111", "WhatsApp": "+919845041111", "Email": "dahisarwest@enrichsalon.com",
        "Address": "Link Road, Dahisar West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.4, "Reviews": 290, "Website": "enrichsalon.com", "Instagram": "@enrichdahisar",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 85,
        "Staff Size": 8, "Lead Score": 85, "Lead Status": "HOT",
        "Recommended Pitch": "AI Receptionist + WhatsApp CRM",
        "Notes": "Residential customer base. Needs automated conversational review gathering after checkout."
    },
    {
        "Lead ID": "L-045", "Salon Name": "Glamour Salon & Spa (Mumbai - Mira Road East)", "Owner Name": "Sanjay Patel",
        "Phone": "+912228114455", "WhatsApp": "+919892044455", "Email": "miraroad@glamoursalon.co.in",
        "Address": "Kanakia Park, Mira Road East", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.2, "Reviews": 380, "Website": "glamoursalon.co.in", "Instagram": "@glamourmira",
        "Facebook": "", "Category": "Unisex Salon & Spa", "Branches": 1,
        "Staff Size": 7, "Lead Score": 70, "Lead Status": "WARM",
        "Recommended Pitch": "Basic POS Billing + Free Trial",
        "Notes": "Suburban mid-market unisex outlet. Uses local accounting desktop tool."
    },
    {
        "Lead ID": "L-046", "Salon Name": "Star & Sitara Salon (Mumbai - Mira Road West)", "Owner Name": "Alkesh Shah",
        "Phone": "+912228122233", "WhatsApp": "+919819933344", "Email": "mirawest@starsitara.in",
        "Address": "Station Road, Mira Road West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.0, "Reviews": 110, "Website": "starsitara.in", "Instagram": "@starsitara_mira",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 1,
        "Staff Size": 4, "Lead Score": 55, "Lead Status": "COLD",
        "Recommended Pitch": "Basic POS Billing + Free Trial",
        "Notes": "Small local desk. Relies on paper ledger logs for stylist scheduling."
    },
    {
        "Lead ID": "L-047", "Salon Name": "Lakme Salon (Mumbai - Bhayander West)", "Owner Name": "Preeti Vyas",
        "Phone": "+912228145566", "WhatsApp": "+919833055566", "Email": "bhayander@lakmesalon.co.in",
        "Address": "Maxus Mall Road, Bhayander West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.3, "Reviews": 310, "Website": "lakmesalon.in", "Instagram": "@lakmebhayander",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 450,
        "Staff Size": 9, "Lead Score": 85, "Lead Status": "HOT",
        "Recommended Pitch": "Staff Commission Engine + WhatsApp Booking",
        "Notes": "Busy mall outlet. Stylists demand weekly commission tracking ledger accessibility."
    },
    {
        "Lead ID": "L-048", "Salon Name": "Kapils Salon (Mumbai - Bhayander East)", "Owner Name": "Jatin Solanki",
        "Phone": "+912228167788", "WhatsApp": "+919819977889", "Email": "bhayandereast@kapilssalon.com",
        "Address": "Cabin Road, Bhayander East", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.1, "Reviews": 240, "Website": "kapilssalon.com", "Instagram": "@kapilsbhayander",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 35,
        "Staff Size": 8, "Lead Score": 80, "Lead Status": "WARM",
        "Recommended Pitch": "Staff Commission Engine + POS Reconciliation",
        "Notes": "Suburban regional network branch. Needs automated payout logs."
    },
    {
        "Lead ID": "L-049", "Salon Name": "Femina Flaunt Salon (Mumbai - Mira Road East)", "Owner Name": "Neha Gupta",
        "Phone": "+912228185555", "WhatsApp": "+919819985555", "Email": "mirasrishti@feminaflaunt.com",
        "Address": "Srishti Complex, Mira Road East", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.3, "Reviews": 190, "Website": "feminaflauntsalon.com", "Instagram": "@feminaflaunt_mira",
        "Facebook": "", "Category": "Unisex Salon", "Branches": 12,
        "Staff Size": 8, "Lead Score": 80, "Lead Status": "WARM",
        "Recommended Pitch": "Automated AI Rebooking + Review Collection",
        "Notes": "Suburban chain hub. Struggles with client churn during weekdays."
    },
    {
        "Lead ID": "L-050", "Salon Name": "Geetanjali Salon (Mumbai - Borivali West)", "Owner Name": "Rajesh Shah",
        "Phone": "+912228944444", "WhatsApp": "+919810855555", "Email": "borivalilt@geetanjali.com",
        "Address": "L.T. Road, Borivali West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.5, "Reviews": 430, "Website": "geetanjalisalon.com", "Instagram": "@geetanjaliborivali",
        "Facebook": "", "Category": "Premium Salon Chain", "Branches": 90,
        "Staff Size": 12, "Lead Score": 95, "Lead Status": "HOT",
        "Recommended Pitch": "Staff Commission Engine + POS Reconciliation",
        "Notes": "Styling lounge. Managers complain about manual calculation of commission slabs."
    },
    {
        "Lead ID": "L-051", "Salon Name": "Truefitt & Hill (Mumbai - Malad West)", "Owner Name": "Saurabh Mehta",
        "Phone": "+912228834444", "WhatsApp": "+919820024444", "Email": "malad@truefittandhill.in",
        "Address": "Palm Spring, Link Road, Malad West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.6, "Reviews": 170, "Website": "truefittandhill.in", "Instagram": "@truefittmalad",
        "Facebook": "", "Category": "Premium Barbershop", "Branches": 28,
        "Staff Size": 5, "Lead Score": 85, "Lead Status": "HOT",
        "Recommended Pitch": "AI Booking Engine (Exclusive VIP Concierge)",
        "Notes": "Bespoke styling boutique for premium Malad West clients."
    }
]

def append_suburban_leads():
    # 1. Update CSV
    if os.path.exists(csv_path):
        try:
            with open(csv_path, 'r', newline='', encoding='utf-8') as f:
                reader = list(csv.reader(f))
            headers = reader[0]
            lead_id_idx = headers.index("Lead ID")
            existing_ids = [row[lead_id_idx] for row in reader[1:] if len(row) > lead_id_idx]

            appended_count = 0
            for lead in suburban_mumbai_leads:
                if lead["Lead ID"] not in existing_ids:
                    row_to_append = [str(lead.get(h, '')) for h in headers]
                    with open(csv_path, 'a', newline='', encoding='utf-8') as f:
                        writer = csv.writer(f)
                        writer.writerow(row_to_append)
                    appended_count += 1
            print(f"Successfully appended {appended_count} suburban leads to CSV.")
        except Exception as e:
            print(f"Error updating CSV: {e}")

    # 2. Update XLSX
    if os.path.exists(xlsx_path):
        try:
            df = pd.read_excel(xlsx_path)
            new_leads = [l for l in suburban_mumbai_leads if l["Lead ID"] not in df["Lead ID"].values]
            if new_leads:
                new_df = pd.DataFrame(new_leads)
                df = pd.concat([df, new_df], ignore_index=True)
                df.to_excel(xlsx_path, index=False)
                print(f"Successfully appended {len(new_leads)} suburban leads to XLSX.")
            else:
                print("No new suburban leads to add to XLSX (already present).")
        except Exception as e:
            print(f"Error updating XLSX: {e}")

    # 3. Update XLS
    if os.path.exists(xls_path):
        try:
            import xlwt
            df = pd.read_excel(xls_path, engine='xlrd')
            new_leads = [l for l in suburban_mumbai_leads if l["Lead ID"] not in df["Lead ID"].values]
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
                print(f"Successfully appended {len(new_leads)} suburban leads to XLS.")
            else:
                print("No new suburban leads to add to XLS (already present).")
        except Exception as e:
            print(f"Error updating XLS: {e}")

if __name__ == "__main__":
    append_suburban_leads()
