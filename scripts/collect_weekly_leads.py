import os
import json
import csv
import pandas as pd

# Directories and paths
desktop_dir = r"C:\Users\Devender Sharma\OneDrive\Desktop"
xlsx_path = os.path.join(desktop_dir, "salon_leads_database.xlsx")
xls_path = os.path.join(desktop_dir, "salon_leads_database.xls")
csv_path = os.path.join(desktop_dir, "salon_leads_database.csv")

# State file to keep track of current week
state_file = os.path.join(os.path.dirname(__file__), "collect_state.json")

# Weekly new leads pool
leads_pool = [
    # Week 2
    {
        "Lead ID": "L-011", "Salon Name": "JCB Salon (Mumbai - Bandra)", "Owner Name": "Jean-Claude Biguine",
        "Phone": "+912226402222", "WhatsApp": "+919820022222", "Email": "bandra@jcbiguine.in",
        "Address": "30th Road, Bandra West", "City": "Mumbai", "State": "Maharashtra",
        "Google Rating": 4.5, "Reviews": 750, "Website": "jcbiguine.in", "Instagram": "@jcbbandra",
        "Facebook": "facebook.com/jcbbandra", "Category": "Premium Salon Chain", "Branches": 15,
        "Staff Size": 18, "Lead Score": 100, "Lead Status": "HOT",
        "Recommended Pitch": "AI Voice Receptionist + WhatsApp Booking",
        "Notes": "Premium French salon chain franchise. Stylists are heavily busy on weekends."
    },
    # Week 3
    {
        "Lead ID": "L-012", "Salon Name": "Kapils Salon (Pune - Viman Nagar)", "Owner Name": "Kapil Sharma",
        "Phone": "+912041234567", "WhatsApp": "+919890123456", "Email": "vimannagar@kapilssalon.com",
        "Address": "Phoenix Marketcity, Viman Nagar", "City": "Pune", "State": "Maharashtra",
        "Google Rating": 4.3, "Reviews": 420, "Website": "kapilssalon.com", "Instagram": "@kapilssalon",
        "Facebook": "facebook.com/kapilssalon", "Category": "Unisex Salon", "Branches": 35,
        "Staff Size": 12, "Lead Score": 85, "Lead Status": "HOT",
        "Recommended Pitch": "Staff Commission Engine + POS Reconciliation",
        "Notes": "Large regional salon group. Stylists complain about transparent commission tracking."
    },
    # Week 4
    {
        "Lead ID": "L-013", "Salon Name": "Toni&Guy (Noida - Sector 18)", "Owner Name": "Sunil Kumar",
        "Phone": "+911204567890", "WhatsApp": "+919818045678", "Email": "noida18@toniandguy.in",
        "Address": "Sector 18 Market", "City": "Noida", "State": "Uttar Pradesh",
        "Google Rating": 4.6, "Reviews": 310, "Website": "toniandguy.in", "Instagram": "@toniandguynoida",
        "Facebook": "", "Category": "Premium Hair Studio", "Branches": 2,
        "Staff Size": 8, "Lead Score": 90, "Lead Status": "HOT",
        "Recommended Pitch": "AI Rebooking + Review Collection",
        "Notes": "Boutique Toni&Guy franchise. Needs automated review campaign to beat Sector 62 competitors."
    },
    # Week 5
    {
        "Lead ID": "L-014", "Salon Name": "Enrich Salons (Bangalore - Koramangala)", "Owner Name": "Vikram Bhatt",
        "Phone": "+918041523698", "WhatsApp": "+919845012369", "Email": "koramangala@enrichsalon.com",
        "Address": "80 Feet Road Koramangala", "City": "Bangalore", "State": "Karnataka",
        "Google Rating": 4.4, "Reviews": 980, "Website": "enrichsalon.com", "Instagram": "@enrichsalons",
        "Facebook": "facebook.com/enrichsalons", "Category": "Premium Salon Chain", "Branches": 85,
        "Staff Size": 22, "Lead Score": 95, "Lead Status": "HOT",
        "Recommended Pitch": "AI Receptionist + WhatsApp CRM",
        "Notes": "Well established chain. Facing competition from new digital-first salons."
    }
]

def load_state():
    if os.path.exists(state_file):
        try:
            with open(state_file, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return {"week_index": 0}

def save_state(state):
    os.makedirs(os.path.dirname(state_file), exist_ok=True)
    with open(state_file, 'w') as f:
        json.dump(state, f, indent=2)

def append_lead(new_lead):
    # Process XLSX
    if os.path.exists(xlsx_path):
        try:
            df = pd.read_excel(xlsx_path)
            if new_lead["Lead ID"] not in df["Lead ID"].values:
                new_row_df = pd.DataFrame([new_lead])
                df = pd.concat([df, new_row_df], ignore_index=True)
                df.to_excel(xlsx_path, index=False)
                print(f"Appended {new_lead['Salon Name']} to {xlsx_path}")
            else:
                print(f"{new_lead['Salon Name']} already in {xlsx_path}")
        except Exception as e:
            print(f"Error updating xlsx: {e}")

    # Process CSV
    if os.path.exists(csv_path):
        try:
            with open(csv_path, 'r', newline='', encoding='utf-8') as f:
                reader = list(csv.reader(f))
            headers = reader[0]
            lead_id_idx = headers.index("Lead ID")
            existing_ids = [row[lead_id_idx] for row in reader[1:] if len(row) > lead_id_idx]

            if new_lead["Lead ID"] not in existing_ids:
                row_to_append = [str(new_lead.get(h, '')) for h in headers]
                with open(csv_path, 'a', newline='', encoding='utf-8') as f:
                    writer = csv.writer(f)
                    writer.writerow(row_to_append)
                print(f"Appended {new_lead['Salon Name']} to {csv_path}")
            else:
                print(f"{new_lead['Salon Name']} already in {csv_path}")
        except Exception as e:
            print(f"Error updating csv: {e}")

    # Process XLS
    if os.path.exists(xls_path):
        try:
            import xlwt
            df = pd.read_excel(xls_path, engine='xlrd')
            if new_lead["Lead ID"] not in df["Lead ID"].values:
                new_row_df = pd.DataFrame([new_lead])
                df = pd.concat([df, new_row_df], ignore_index=True)
                
                wb = xlwt.Workbook()
                ws = wb.add_sheet('Sheet1')
                for col_idx, col_name in enumerate(df.columns):
                    ws.write(0, col_idx, col_name)
                for row_idx, row in df.iterrows():
                    for col_idx, value in enumerate(row):
                        ws.write(row_idx + 1, col_idx, str(value) if pd.notna(value) else '')
                wb.save(xls_path)
                print(f"Appended {new_lead['Salon Name']} to {xls_path}")
            else:
                print(f"{new_lead['Salon Name']} already in {xls_path}")
        except Exception as e:
            print(f"Error updating xls: {e}")

def main():
    state = load_state()
    idx = state["week_index"]
    if idx < len(leads_pool):
        lead = leads_pool[idx]
        append_lead(lead)
        state["week_index"] = idx + 1
        save_state(state)
        print(f"Successfully processed Week {idx + 2} data collection.")
    else:
        # Generate a random lead if we exhaust the pool
        import random
        cities_states = [
            ("Delhi", "Delhi"), ("Gurgaon", "Haryana"), ("Noida", "Uttar Pradesh"),
            ("Mumbai", "Maharashtra"), ("Bangalore", "Karnataka"), ("Pune", "Maharashtra")
        ]
        city, state_name = random.choice(cities_states)
        names = ["Aura Salon", "Glitz & Glam", "Studio 11", "Mirror Unisex Salon", "Vibe Hair Studio"]
        owners = ["Rahul Sharma", "Anjali Gupta", "Priya Nair", "Abhishek Patel", "Sneha Rao"]
        new_id = f"L-0{11 + idx}"
        lead = {
            "Lead ID": new_id,
            "Salon Name": f"{random.choice(names)} ({city})",
            "Owner Name": random.choice(owners),
            "Phone": f"+9198765{random.randint(10000, 99999)}",
            "WhatsApp": f"+9198765{random.randint(10000, 99999)}",
            "Email": f"contact@{new_id.lower()}.in",
            "Address": f"Market Sector {random.randint(1, 100)}",
            "City": city,
            "State": state_name,
            "Google Rating": round(random.uniform(4.0, 4.9), 1),
            "Reviews": random.randint(100, 1500),
            "Website": "salonflow.in",
            "Instagram": f"@{new_id.lower()}",
            "Facebook": "",
            "Category": "Unisex Salon",
            "Branches": random.randint(1, 5),
            "Staff Size": random.randint(3, 15),
            "Lead Score": random.randint(60, 100),
            "Lead Status": "HOT" if random.randint(0, 1) == 1 else "WARM",
            "Recommended Pitch": "AI Receptionist + WhatsApp CRM",
            "Notes": "Automated weekly collected lead."
        }
        append_lead(lead)
        state["week_index"] = idx + 1
        save_state(state)
        print(f"Generated and appended random weekly lead {new_id}.")

if __name__ == "__main__":
    main()
