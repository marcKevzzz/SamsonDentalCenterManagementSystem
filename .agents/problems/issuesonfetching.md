info: [System.Net](http://System.Net).Http.HttpClient.SupabaseClient.LogicalHandler[100]
      Start processing HTTP request GET https://iglnkxzttnkjnvdzccji.supabase.co/rest/v1/doctors?*
info: [System.Net](http://System.Net).Http.HttpClient.SupabaseClient.ClientHandler[100]
      Sending HTTP request GET https://iglnkxzttnkjnvdzccji.supabase.co/rest/v1/doctors?*
info: [System.Net](http://System.Net).Http.HttpClient.SupabaseClient.ClientHandler[101]
      Received HTTP response headers after 452.0669ms - 200
info: [System.Net](http://System.Net).Http.HttpClient.SupabaseClient.LogicalHandler[101]
      End processing HTTP request after 574.3205ms - 200
info: [System.Net](http://System.Net).Http.HttpClient.SupabaseClient.LogicalHandler[100]
      Start processing HTTP request GET https://iglnkxzttnkjnvdzccji.supabase.co/rest/v1/appointments?*
info: [System.Net](http://System.Net).Http.HttpClient.SupabaseClient.ClientHandler[100]
      Sending HTTP request GET https://iglnkxzttnkjnvdzccji.supabase.co/rest/v1/appointments?*
info: [System.Net](http://System.Net).Http.HttpClient.SupabaseClient.ClientHandler[101]
      Received HTTP response headers after 172.1882ms - 200
info: [System.Net](http://System.Net).Http.HttpClient.SupabaseClient.LogicalHandler[101]
      End processing HTTP request after 172.38ms - 200
info: [System.Net](http://System.Net).Http.HttpClient.SupabaseClient.LogicalHandler[100]
      Start processing HTTP request GET https://iglnkxzttnkjnvdzccji.supabase.co/rest/v1/invoices?*
info: [System.Net](http://System.Net).Http.HttpClient.SupabaseClient.ClientHandler[100]
      Sending HTTP request GET https://iglnkxzttnkjnvdzccji.supabase.co/rest/v1/invoices?*
info: [System.Net](http://System.Net).Http.HttpClient.SupabaseClient.ClientHandler[101]
      Received HTTP response headers after 164.7077ms - 200
info: [System.Net](http://System.Net).Http.HttpClient.SupabaseClient.LogicalHandler[101]
      End processing HTTP request after 164.8899ms - 200


```pgsql
select
  p.*, d.*
from
  doctors d
  join profiles p on d.profile_id = p.id;
```

[
  {
    "id": "d1aeb482-ff6b-4c19-a35a-4399aba89e98",
    "first_name": "Lia",
    "last_name": "Cayabyab",
    "date_of_birth": "2020-02-16",
    "sex": "Female",
    "phone_number": "+639155473200",
    "address": "Emerald St. Q.C",
    "role": "admin",
    "created_at": "2026-04-25 13:47:36.918451+00",
    "updated_at": "2026-04-04 08:52:55.460809+00",
    "avatar_url": null,
    "email": "[malinglia@gmail.com](mailto:malinglia@gmail.com)",
    "title": "Dr.",
    "specialties": [
      "General Dentistry",
      "Cosmetic",
      "Specialized"
    ],
    "bio": "Known for their gentle touch and calm demeanor, Dr. Lia Cayabyab strives to make every dental visit a comfortable experience. With a focus on preventative care and patient education.",
    "is_active": true,
    "profile_id": "7f6633c9-7d02-4e50-9d06-b2bc39ed33fc"
  },
  {
    "id": "1bdf6368-255f-4836-98f4-60a782eba40d",
    "first_name": "Maria",
    "last_name": "Santos",
    "date_of_birth": "1995-03-15",
    "sex": "Female",
    "phone_number": "+639171234567",
    "address": "Quezon City, Metro Manila",
    "role": "doctor",
    "created_at": "2026-04-12 14:10:08.942418+00",
    "updated_at": "2026-04-23 03:26:41.300002+00",
    "avatar_url": null,
    "email": "[motewos439@hacknapp.com](mailto:motewos439@hacknapp.com)",
    "title": "Dr.",
    "specialties": [
      "General Dentistry",
      "Cosmetic",
      "Specialized"
    ],
    "bio": "General dentist with 12 years experience specializing in restorative and cosmetic procedures.",
    "is_active": true,
    "profile_id": "afad9498-477a-422f-b66a-6435db47f32c"
  },
  {
    "id": "dd9ab02b-2af7-4a09-8c7e-5dfe93b23f80",
    "first_name": "Ana",
    "last_name": "Cruz",
    "date_of_birth": "1991-07-21",
    "sex": "Female",
    "phone_number": "+639195550123",
    "address": "Pasig City, Metro Manila",
    "role": "patient",
    "created_at": "2026-04-12 14:10:08.942418+00",
    "updated_at": "2026-04-23 03:46:58.238398+00",
    "avatar_url": null,
    "email": "[cti852zx4n@ozsaip.com](mailto:cti852zx4n@ozsaip.com)",
    "title": "Dr.",
    "specialties": [
      "Cosmetic",
      "General Dentistry"
    ],
    "bio": "Cosmetic dentistry expert focused on smile design and teeth whitening treatments.",
    "is_active": true,
    "profile_id": "cc77b161-8377-4348-bb81-e63b2cce15ac"
  },
  {
    "id": "71e36144-4cf0-4ec8-9344-c9c2255a8451",
    "first_name": "Marc kevin",
    "last_name": "kevs",
    "date_of_birth": "2006-09-21",
    "sex": "Male",
    "phone_number": "+639155473200",
    "address": "emerald",
    "role": "doctor",
    "created_at": "2026-04-12 14:10:08.942418+00",
    "updated_at": "2026-04-06 09:53:34.44722+00",
    "avatar_url": "https://iglnkxzttnkjnvdzccji.supabase.co/storage/v1/object/public/avatars/avatars/b4fae8d5-c07f-4a58-883d-024573b1766c.jpg",
    "email": "[marckevindelmundo@gmail.com](mailto:marckevindelmundo@gmail.com)",
    "title": "Dr.",
    "specialties": [
      "General Dentistry",
      "Specialized"
    ],
    "bio": "Specialist in oral surgery and orthodontics with 8 years clinical experience.",
    "is_active": true,
    "profile_id": "b4fae8d5-c07f-4a58-883d-024573b1766c"
  }
]

```pgsql
select
  i.*, ii.*, t.*
from
  invoices i
  join invoice_items ii on ii.invoice_id = i.id
  join treatments t on t.invoice_id = i.id;
```

[
  {
    "id": "34d605f8-64c0-439a-bf8a-d5c7f57eddd5",
    "appointment_id": "6b732782-efd3-4ec5-9454-af7d1b1ab199",
    "patient_id": "695c7e12-0e1d-4488-b1e7-a1300af5b23b",
    "doctor_id": "71e36144-4cf0-4ec8-9344-c9c2255a8451",
    "total_amount": "5000.00",
    "discount_amount": "0.00",
    "final_amount": "5000.00",
    "status": "completed",
    "notes": null,
    "created_at": "2026-04-26 14:20:16.789586+00",
    "updated_at": "2026-04-26 14:20:16.809581+00",
    "invoice_id": "673e56ed-038b-45e6-8250-dd5567a308ef",
    "service_id": "98ffb029-00e3-4bcc-92bd-e60bcf741538",
    "description": "Root Canal Treatment",
    "unit_price": "5000.00",
    "quantity": 1,
    "total_price": "5000.00",
    "service_name": "Root Canal Treatment",
    "tooth_numbers": "14",
    "procedure_details": "Tooth Extraction",
    "diagnosis": null
  }
]


```pgsql
SELECT
  a.*,
  s.*,
  d.specialties AS doctor_specialties,
  dp.first_name AS doctor_first_name,
  dp.last_name AS doctor_last_name,
  p.first_name AS patient_first_name,
  p.last_name AS patient_last_name
FROM appointments a
-- Inner Join: Every appointment must have a service
JOIN dental_services s ON a.service_id = s.id
-- Left Join: Keeps appointment even if no doctor is assigned
LEFT JOIN doctors d ON a.doctor_id = d.id
-- Left Join: Gets doctor names from profiles only if a doctor exists
LEFT JOIN profiles dp ON d.profile_id = dp.id
-- Left Join: Handles Guest Mode (patient_id is NULL)
LEFT JOIN profiles p ON a.patient_id = p.id;
```

[
  {
    "id": "b612f047-80d7-42f4-a6da-f85566f18808",
    "patient_id": null,
    "patient_name": "Marc kevin Del Mundo",
    "patient_email": "marckevindelmundo@gmail.com",
    "patient_phone": "+639155473200",
    "patient_sex": "Male",
    "patient_dob": "2011-02-23",
    "is_guest": true,
    "is_for_other": false,
    "other_sex": null,
    "other_dob": null,
    "service_id": "b612f047-80d7-42f4-a6da-f85566f18808",
    "service_name": "Dental Fillings",
    "doctor_id": null,
    "appointment_date": "2026-04-20",
    "appointment_time": "1:00 PM",
    "duration_minutes": 60,
    "status": "pending",
    "is_waitlist": false,
    "waitlist_position": null,
    "confirmation_token": "de2f858d80be4521b8d82d04d8a96a0b",
    "confirmed_at": null,
    "notes": null,
    "created_at": "2026-04-06 11:10:30.99302+00",
    "updated_at": "2026-04-26 05:14:51.343461+00",
    "email_status": "Pending",
    "other_first_name": null,
    "other_last_name": null,
    "other_email": null,
    "other_phone": null,
    "slug": "dental-fillings",
    "category": "General Dentistry",
    "name": "Dental Fillings",
    "tagline": "Restore decayed or damaged teeth",
    "hero": "https://t4.ftcdn.net/jpg/09/23/21/35/360_F_923213586_uUeGCcZSY2stwzGLaCfeuHI4eDRpNi1Y.jpg",
    "icon": "fa-hand-holding-heart",
    "summary": "Tooth-colored composite fillings that blend naturally with your smile.",
    "duration": "30–45 min",
    "recovery": "None",
    "price": "600.00",
    "benefits": [
      "Stops decay",
      "Natural appearance",
      "Durable",
      "Same-day procedure"
    ],
    "steps": [
      "Decay removal",
      "Cleaning the cavity",
      "Applying composite resin",
      "Buffing and polishing"
    ],
    "faqs": [
      {
        "answer": "With good hygiene, they typically last 5 to 10 years.",
        "question": "How long do composite fillings last?"
      },
      {
        "answer": "Yes, but be careful if your mouth is still numb to avoid biting your cheek or tongue.",
        "question": "Can I eat right after a filling?"
      }
    ],
    "is_active": true,
    "doctor_specialties": null,
    "doctor_first_name": null,
    "doctor_last_name": null,
    "patient_first_name": null,
    "patient_last_name": null
  },
  {
    "id": "272843ad-7d80-4093-8259-a443a383ea09",
    "patient_id": null,
    "patient_name": "Marc kevin Del Mundo",
    "patient_email": "marckevindelmundo@gmail.com",
    "patient_phone": "+639155473200",
    "patient_sex": "Male",
    "patient_dob": "2026-03-29",
    "is_guest": true,
    "is_for_other": false,
    "other_sex": null,
    "other_dob": null,
    "service_id": "272843ad-7d80-4093-8259-a443a383ea09",
    "service_name": "Tooth Extraction",
    "doctor_id": null,
    "appointment_date": "2026-04-18",
    "appointment_time": "4:00 PM",
    "duration_minutes": 60,
    "status": "pending",
    "is_waitlist": false,
    "waitlist_position": null,
    "confirmation_token": "34b709be6dd243ffab2ed2b7de02a6a8",
    "confirmed_at": "2026-04-20 04:51:38.606444+00",
    "notes": null,
    "created_at": "2026-04-06 11:10:30.99302+00",
    "updated_at": "2026-04-26 04:06:13.282732+00",
    "email_status": "confirmed",
    "other_first_name": null,
    "other_last_name": null,
    "other_email": null,
    "other_phone": null,
    "slug": "tooth-extraction",
    "category": "General Dentistry",
    "name": "Tooth Extraction",
    "tagline": "Safe and gentle tooth removal",
    "hero": "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&q=80&w=1200",
    "icon": "fa-hand-holding-heart",
    "summary": "Simple and surgical extractions performed with care and precision.",
    "duration": "30–60 min",
    "recovery": "1–3 days",
    "price": "500.00",
    "benefits": [
      "Pain relief",
      "Prevents infection spread",
      "Quick recovery",
      "Local anesthesia"
    ],
    "steps": [
      "X-ray assessment",
      "Numbing the area",
      "Gentle tooth removal",
      "Aftercare instructions"
    ],
    "faqs": [
      {
        "answer": "Stick to soft foods like yogurt, mashed potatoes, and soup for the first 24 hours.",
        "question": "What can I eat after an extraction?"
      },
      {
        "answer": "The area will be completely numbed during the procedure. Post-op discomfort is managed with mild pain relievers.",
        "question": "Will it be painful?"
      }
    ],
    "is_active": true,
    "doctor_specialties": null,
    "doctor_first_name": null,
    "doctor_last_name": null,
    "patient_first_name": null,
    "patient_last_name": null
  },
  {
    "id": "b612f047-80d7-42f4-a6da-f85566f18808",
    "patient_id": null,
    "patient_name": "Marc kevin Del Mundo",
    "patient_email": "marckevindelmundo@gmail.com",
    "patient_phone": "+639155473200",
    "patient_sex": "Female",
    "patient_dob": "2026-04-13",
    "is_guest": true,
    "is_for_other": false,
    "other_sex": null,
    "other_dob": null,
    "service_id": "b612f047-80d7-42f4-a6da-f85566f18808",
    "service_name": "Dental Fillings",
    "doctor_id": null,
    "appointment_date": "2026-04-19",
    "appointment_time": "1:00 PM",
    "duration_minutes": 60,
    "status": "pending",
    "is_waitlist": false,
    "waitlist_position": null,
    "confirmation_token": "f17ca7dc4b504dfb8bf37fb65c3e5e41",
    "confirmed_at": "2026-04-20 05:14:15.895289+00",
    "notes": null,
    "created_at": "2026-04-06 11:10:30.99302+00",
    "updated_at": "2026-04-26 05:14:51.343461+00",
    "email_status": "confirmed",
    "other_first_name": null,
    "other_last_name": null,
    "other_email": null,
    "other_phone": null,
    "slug": "dental-fillings",
    "category": "General Dentistry",
    "name": "Dental Fillings",
    "tagline": "Restore decayed or damaged teeth",
    "hero": "https://t4.ftcdn.net/jpg/09/23/21/35/360_F_923213586_uUeGCcZSY2stwzGLaCfeuHI4eDRpNi1Y.jpg",
    "icon": "fa-hand-holding-heart",
    "summary": "Tooth-colored composite fillings that blend naturally with your smile.",
    "duration": "30–45 min",
    "recovery": "None",
    "price": "600.00",
    "benefits": [
      "Stops decay",
      "Natural appearance",
      "Durable",
      "Same-day procedure"
    ],
    "steps": [
      "Decay removal",
      "Cleaning the cavity",
      "Applying composite resin",
      "Buffing and polishing"
    ],
    "faqs": [
      {
        "answer": "With good hygiene, they typically last 5 to 10 years.",
        "question": "How long do composite fillings last?"
      },
      {
        "answer": "Yes, but be careful if your mouth is still numb to avoid biting your cheek or tongue.",
        "question": "Can I eat right after a filling?"
      }
    ],
    "is_active": true,
    "doctor_specialties": null,
    "doctor_first_name": null,
    "doctor_last_name": null,
    "patient_first_name": null,
    "patient_last_name": null
  },
  {
    "id": "b612f047-80d7-42f4-a6da-f85566f18808",
    "patient_id": null,
    "patient_name": "Marc kevin Del Mundo",
    "patient_email": "marckevindelmundo@gmail.com",
    "patient_phone": "+639155473200",
    "patient_sex": "Male",
    "patient_dob": "2026-04-07",
    "is_guest": true,
    "is_for_other": false,
    "other_sex": null,
    "other_dob": null,
    "service_id": "b612f047-80d7-42f4-a6da-f85566f18808",
    "service_name": "Dental Fillings",
    "doctor_id": null,
    "appointment_date": "2026-04-20",
    "appointment_time": "10:00 AM",
    "duration_minutes": 60,
    "status": "pending",
    "is_waitlist": false,
    "waitlist_position": null,
    "confirmation_token": "fc2e4f94f65f47bebad7283bcdca2ea1",
    "confirmed_at": null,
    "notes": null,
    "created_at": "2026-04-06 11:10:30.99302+00",
    "updated_at": "2026-04-26 05:14:51.343461+00",
    "email_status": "pending",
    "other_first_name": null,
    "other_last_name": null,
    "other_email": null,
    "other_phone": null,
    "slug": "dental-fillings",
    "category": "General Dentistry",
    "name": "Dental Fillings",
    "tagline": "Restore decayed or damaged teeth",
    "hero": "https://t4.ftcdn.net/jpg/09/23/21/35/360_F_923213586_uUeGCcZSY2stwzGLaCfeuHI4eDRpNi1Y.jpg",
    "icon": "fa-hand-holding-heart",
    "summary": "Tooth-colored composite fillings that blend naturally with your smile.",
    "duration": "30–45 min",
    "recovery": "None",
    "price": "600.00",
    "benefits": [
      "Stops decay",
      "Natural appearance",
      "Durable",
      "Same-day procedure"
    ],
    "steps": [
      "Decay removal",
      "Cleaning the cavity",
      "Applying composite resin",
      "Buffing and polishing"
    ],
    "faqs": [
      {
        "answer": "With good hygiene, they typically last 5 to 10 years.",
        "question": "How long do composite fillings last?"
      },
      {
        "answer": "Yes, but be careful if your mouth is still numb to avoid biting your cheek or tongue.",
        "question": "Can I eat right after a filling?"
      }
    ],
    "is_active": true,
    "doctor_specialties": null,
    "doctor_first_name": null,
    "doctor_last_name": null,
    "patient_first_name": null,
    "patient_last_name": null
  },
  {
    "id": "b3b09400-f984-44cc-a10e-1971dba3bbac",
    "patient_id": null,
    "patient_name": "Marc kevin Del Mundo",
    "patient_email": "mkvf2005@gmail.com",
    "patient_phone": "+639155473200",
    "patient_sex": "Male",
    "patient_dob": "2026-04-28",
    "is_guest": true,
    "is_for_other": false,
    "other_sex": null,
    "other_dob": null,
    "service_id": "b3b09400-f984-44cc-a10e-1971dba3bbac",
    "service_name": "Teeth Cleaning",
    "doctor_id": null,
    "appointment_date": "2026-04-20",
    "appointment_time": "1:00 PM",
    "duration_minutes": 60,
    "status": "pending",
    "is_waitlist": false,
    "waitlist_position": null,
    "confirmation_token": "96d7c7b1bf4343edaffb7fe0836b5b65",
    "confirmed_at": null,
    "notes": null,
    "created_at": "2026-04-06 11:10:30.99302+00",
    "updated_at": "2026-04-26 04:06:13.282732+00",
    "email_status": "pending",
    "other_first_name": null,
    "other_last_name": null,
    "other_email": null,
    "other_phone": null,
    "slug": "teeth-cleaning",
    "category": "General Dentistry",
    "name": "Teeth Cleaning",
    "tagline": "Professional plaque and tartar removal",
    "hero": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=1200",
    "icon": "fa-hand-holding-heart",
    "summary": "A thorough professional cleaning to remove plaque, tartar and surface stains.",
    "duration": "45–60 min",
    "recovery": "None",
    "price": "800.00",
    "benefits": [
      "Fresher breath",
      "Prevents cavities",
      "Brighter smile",
      "Gum disease prevention"
    ],
    "steps": [
      "Oral examination",
      "Plaque and tartar scaling",
      "Polishing",
      "Fluoride treatment"
    ],
    "faqs": [
      {
        "answer": "Most patients experience no pain, though you might feel some pressure or mild vibrations.",
        "question": "Does teeth cleaning hurt?"
      },
      {
        "answer": "We recommend a professional cleaning every 6 months to maintain optimal oral health.",
        "question": "How often should I get a cleaning?"
      }
    ],
    "is_active": true,
    "doctor_specialties": null,
    "doctor_first_name": null,
    "doctor_last_name": null,
    "patient_first_name": null,
    "patient_last_name": null
  },
  {
    "id": "98ffb029-00e3-4bcc-92bd-e60bcf741538",
    "patient_id": "695c7e12-0e1d-4488-b1e7-a1300af5b23b",
    "patient_name": "Chris Ferdrei",
    "patient_email": "chris@gmail.com",
    "patient_phone": "09111111111",
    "patient_sex": "Male",
    "patient_dob": "2008-10-01",
    "is_guest": false,
    "is_for_other": false,
    "other_sex": null,
    "other_dob": null,
    "service_id": "98ffb029-00e3-4bcc-92bd-e60bcf741538",
    "service_name": "Root Canal Treatment",
    "doctor_id": null,
    "appointment_date": "2026-04-21",
    "appointment_time": "3:00 PM",
    "duration_minutes": 60,
    "status": "pending",
    "is_waitlist": false,
    "waitlist_position": null,
    "confirmation_token": null,
    "confirmed_at": null,
    "notes": null,
    "created_at": "2026-04-06 11:10:30.99302+00",
    "updated_at": "2026-04-26 04:06:13.282732+00",
    "email_status": "Pending",
    "other_first_name": null,
    "other_last_name": null,
    "other_email": null,
    "other_phone": null,
    "slug": "root-canal",
    "category": "Specialized",
    "name": "Root Canal Treatment",
    "tagline": "Save infected teeth from extraction",
    "hero": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=1200",
    "icon": "fa-microscope",
    "summary": "Endodontic therapy to remove infected pulp and save your natural tooth.",
    "duration": "1–2 visits",
    "recovery": "2–3 days",
    "price": "5000.00",
    "benefits": [
      "Saves natural tooth",
      "Relieves pain",
      "Prevents spread",
      "High success rate"
    ],
    "steps": [
      "Local anesthesia",
      "Accessing the pulp",
      "Cleaning & shaping canals",
      "Sealing with Gutta-percha"
    ],
    "faqs": [
      {
        "answer": "Modern techniques make it as comfortable as getting a filling.",
        "question": "Is a root canal painful?"
      },
      {
        "answer": "Usually, yes. A crown is recommended to protect the tooth after the procedure.",
        "question": "Do I need a crown after?"
      }
    ],
    "is_active": true,
    "doctor_specialties": null,
    "doctor_first_name": null,
    "doctor_last_name": null,
    "patient_first_name": "Chris",
    "patient_last_name": "Ferdrei"
  },
  {
    "id": "b3b09400-f984-44cc-a10e-1971dba3bbac",
    "patient_id": null,
    "patient_name": "Marc kevin Del Mundo",
    "patient_email": "maso@gmail.com",
    "patient_phone": "+639155473200",
    "patient_sex": "Female",
    "patient_dob": "2026-04-04",
    "is_guest": true,
    "is_for_other": false,
    "other_sex": null,
    "other_dob": null,
    "service_id": "b3b09400-f984-44cc-a10e-1971dba3bbac",
    "service_name": "Teeth Cleaning",
    "doctor_id": null,
    "appointment_date": "2026-04-26",
    "appointment_time": "1:00 PM",
    "duration_minutes": 60,
    "status": "arrived",
    "is_waitlist": false,
    "waitlist_position": null,
    "confirmation_token": "887402f0cb944b1b8d1334270787e2b9",
    "confirmed_at": "2026-04-20 11:47:59.625113+00",
    "notes": null,
    "created_at": "2026-04-06 11:10:30.99302+00",
    "updated_at": "2026-04-26 04:06:13.282732+00",
    "email_status": "confirmed",
    "other_first_name": null,
    "other_last_name": null,
    "other_email": null,
    "other_phone": null,
    "slug": "teeth-cleaning",
    "category": "General Dentistry",
    "name": "Teeth Cleaning",
    "tagline": "Professional plaque and tartar removal",
    "hero": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=1200",
    "icon": "fa-hand-holding-heart",
    "summary": "A thorough professional cleaning to remove plaque, tartar and surface stains.",
    "duration": "45–60 min",
    "recovery": "None",
    "price": "800.00",
    "benefits": [
      "Fresher breath",
      "Prevents cavities",
      "Brighter smile",
      "Gum disease prevention"
    ],
    "steps": [
      "Oral examination",
      "Plaque and tartar scaling",
      "Polishing",
      "Fluoride treatment"
    ],
    "faqs": [
      {
        "answer": "Most patients experience no pain, though you might feel some pressure or mild vibrations.",
        "question": "Does teeth cleaning hurt?"
      },
      {
        "answer": "We recommend a professional cleaning every 6 months to maintain optimal oral health.",
        "question": "How often should I get a cleaning?"
      }
    ],
    "is_active": true,
    "doctor_specialties": null,
    "doctor_first_name": null,
    "doctor_last_name": null,
    "patient_first_name": null,
    "patient_last_name": null
  },
  {
    "id": "287d810f-6361-4009-bd80-3161820335d8",
    "patient_id": null,
    "patient_name": "Marc kevin Del Mundo",
    "patient_email": "marckevindelmundo@gmail.com",
    "patient_phone": "+639155473200",
    "patient_sex": "Male",
    "patient_dob": "2026-04-14",
    "is_guest": true,
    "is_for_other": false,
    "other_sex": null,
    "other_dob": null,
    "service_id": "287d810f-6361-4009-bd80-3161820335d8",
    "service_name": "General Dentistry",
    "doctor_id": null,
    "appointment_date": "2026-04-21",
    "appointment_time": "1:00 PM",
    "duration_minutes": 60,
    "status": "cancelled",
    "is_waitlist": false,
    "waitlist_position": null,
    "confirmation_token": "94127bb96ed140ce9eb32a1de514de52",
    "confirmed_at": null,
    "notes": null,
    "created_at": "2026-04-12 11:53:33.476663+00",
    "updated_at": "2026-04-26 04:30:05.998968+00",
    "email_status": "pending",
    "other_first_name": null,
    "other_last_name": null,
    "other_email": null,
    "other_phone": null,
    "slug": "general-dentistry",
    "category": "General Dentistry",
    "name": "General Dentistry",
    "tagline": "Thin porcelain shells for a perfect smile",
    "hero": "https://iglnkxzttnkjnvdzccji.supabase.co/storage/v1/object/public/heroes/service-heroes/6699cd5c-1587-4d2b-b1d1-149fdb53d90f.jpg",
    "icon": "fa-hand-holding-heart",
    "summary": "Keep your smile at its best with our comprehensive general dental care. We focus on prevention and early detection to save you from future discomfort and costly procedures. From thorough cleanings to detailed checkups, we provide the essential care your teeth deserve in a relaxing environment.",
    "duration": "30 - 45 mins",
    "recovery": "None / Immediate",
    "price": "1500.00",
    "benefits": [
      "Prevents cavities and tooth decay.",
      "Early detection of oral health issues.",
      "Professional plaque and tartar removal."
    ],
    "steps": [],
    "faqs": [],
    "is_active": true,
    "doctor_specialties": null,
    "doctor_first_name": null,
    "doctor_last_name": null,
    "patient_first_name": null,
    "patient_last_name": null
  },
  {
    "id": "df868d7a-4c9f-41c0-b110-671f015185b8",
    "patient_id": "695c7e12-0e1d-4488-b1e7-a1300af5b23b",
    "patient_name": "Chris Ferdrei",
    "patient_email": "chris@gmail.com",
    "patient_phone": "09111111111",
    "patient_sex": "Male",
    "patient_dob": "2008-10-01",
    "is_guest": false,
    "is_for_other": false,
    "other_sex": null,
    "other_dob": null,
    "service_id": "df868d7a-4c9f-41c0-b110-671f015185b8",
    "service_name": "Dental Veneers",
    "doctor_id": "dd9ab02b-2af7-4a09-8c7e-5dfe93b23f80",
    "appointment_date": "2026-04-23",
    "appointment_time": "4:00 PM",
    "duration_minutes": 60,
    "status": "arrived",
    "is_waitlist": false,
    "waitlist_position": null,
    "confirmation_token": null,
    "confirmed_at": "2026-04-24 16:28:16.804789+00",
    "notes": null,
    "created_at": "2026-04-06 11:10:30+00",
    "updated_at": "2026-04-26 05:18:37.536092+00",
    "email_status": "confirmed",
    "other_first_name": null,
    "other_last_name": null,
    "other_email": null,
    "other_phone": null,
    "slug": "veneers",
    "category": "Cosmetic",
    "name": "Dental Veneers",
    "tagline": "Thin porcelain shells for a perfect smile",
    "hero": "https://riverfrontdental.ca/wp-content/uploads/2024/03/porcelain-veneers.jpg",
    "icon": "fa-gem",
    "summary": "Custom-crafted porcelain veneers that transform the shape, color and size of your teeth.",
    "duration": "2 visits",
    "recovery": "1–2 days",
    "price": "8000.00",
    "benefits": [
      "Natural look",
      "Stain resistant",
      "Long-lasting",
      "Minimal prep"
    ],
    "steps": [
      "Tooth preparation",
      "Impression taking",
      "Temporary veneer placement",
      "Final bonding"
    ],
    "faqs": [
      {
        "answer": "The process is irreversible because enamel is removed. Veneers last 10-15 years.",
        "question": "Are veneers permanent?"
      },
      {
        "answer": "Porcelain is highly resistant to stains from coffee, tea, and tobacco.",
        "question": "Do they stain?"
      }
    ],
    "is_active": true,
    "doctor_specialties": [
      "Cosmetic",
      "General Dentistry"
    ],
    "doctor_first_name": "Ana",
    "doctor_last_name": "Cruz",
    "patient_first_name": "Chris",
    "patient_last_name": "Ferdrei"
  },
  {
    "id": "b3b09400-f984-44cc-a10e-1971dba3bbac",
    "patient_id": null,
    "patient_name": "Marc kevin Del Mundo",
    "patient_email": "marckevindelmundo@gmail.com",
    "patient_phone": "+639155473200",
    "patient_sex": "Female",
    "patient_dob": "2026-04-01",
    "is_guest": true,
    "is_for_other": false,
    "other_sex": null,
    "other_dob": null,
    "service_id": "b3b09400-f984-44cc-a10e-1971dba3bbac",
    "service_name": "Teeth Cleaning",
    "doctor_id": "dd9ab02b-2af7-4a09-8c7e-5dfe93b23f80",
    "appointment_date": "2026-04-22",
    "appointment_time": "1:00 PM",
    "duration_minutes": 60,
    "status": "confirmed",
    "is_waitlist": false,
    "waitlist_position": null,
    "confirmation_token": "8ed30669adee4986ad6b4f9940d39349",
    "confirmed_at": "2026-04-24 23:25:00.752178+00",
    "notes": null,
    "created_at": "2026-04-06 11:10:30.99302+00",
    "updated_at": "2026-04-26 04:06:13.282732+00",
    "email_status": "confirmed",
    "other_first_name": null,
    "other_last_name": null,
    "other_email": null,
    "other_phone": null,
    "slug": "teeth-cleaning",
    "category": "General Dentistry",
    "name": "Teeth Cleaning",
    "tagline": "Professional plaque and tartar removal",
    "hero": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=1200",
    "icon": "fa-hand-holding-heart",
    "summary": "A thorough professional cleaning to remove plaque, tartar and surface stains.",
    "duration": "45–60 min",
    "recovery": "None",
    "price": "800.00",
    "benefits": [
      "Fresher breath",
      "Prevents cavities",
      "Brighter smile",
      "Gum disease prevention"
    ],
    "steps": [
      "Oral examination",
      "Plaque and tartar scaling",
      "Polishing",
      "Fluoride treatment"
    ],
    "faqs": [
      {
        "answer": "Most patients experience no pain, though you might feel some pressure or mild vibrations.",
        "question": "Does teeth cleaning hurt?"
      },
      {
        "answer": "We recommend a professional cleaning every 6 months to maintain optimal oral health.",
        "question": "How often should I get a cleaning?"
      }
    ],
    "is_active": true,
    "doctor_specialties": [
      "Cosmetic",
      "General Dentistry"
    ],
    "doctor_first_name": "Ana",
    "doctor_last_name": "Cruz",
    "patient_first_name": null,
    "patient_last_name": null
  },
  {
    "id": "b3b09400-f984-44cc-a10e-1971dba3bbac",
    "patient_id": null,
    "patient_name": "Marc kevin Del Mundo",
    "patient_email": "delmundo.marckevin.ferolino@gmail.com",
    "patient_phone": "+639155473200",
    "patient_sex": "Male",
    "patient_dob": "2026-04-06",
    "is_guest": true,
    "is_for_other": false,
    "other_sex": null,
    "other_dob": null,
    "service_id": "b3b09400-f984-44cc-a10e-1971dba3bbac",
    "service_name": "Teeth Cleaning",
    "doctor_id": "71e36144-4cf0-4ec8-9344-c9c2255a8451",
    "appointment_date": "2026-04-24",
    "appointment_time": "12:00 PM",
    "duration_minutes": 60,
    "status": "confirmed",
    "is_waitlist": false,
    "waitlist_position": null,
    "confirmation_token": "d2da14a0472045bca3aeda9490cbac6f",
    "confirmed_at": "2026-04-23 10:13:18+00",
    "notes": null,
    "created_at": "2026-04-06 11:10:30.99302+00",
    "updated_at": "2026-04-26 04:06:13.282732+00",
    "email_status": "confirmed",
    "other_first_name": null,
    "other_last_name": null,
    "other_email": null,
    "other_phone": null,
    "slug": "teeth-cleaning",
    "category": "General Dentistry",
    "name": "Teeth Cleaning",
    "tagline": "Professional plaque and tartar removal",
    "hero": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=1200",
    "icon": "fa-hand-holding-heart",
    "summary": "A thorough professional cleaning to remove plaque, tartar and surface stains.",
    "duration": "45–60 min",
    "recovery": "None",
    "price": "800.00",
    "benefits": [
      "Fresher breath",
      "Prevents cavities",
      "Brighter smile",
      "Gum disease prevention"
    ],
    "steps": [
      "Oral examination",
      "Plaque and tartar scaling",
      "Polishing",
      "Fluoride treatment"
    ],
    "faqs": [
      {
        "answer": "Most patients experience no pain, though you might feel some pressure or mild vibrations.",
        "question": "Does teeth cleaning hurt?"
      },
      {
        "answer": "We recommend a professional cleaning every 6 months to maintain optimal oral health.",
        "question": "How often should I get a cleaning?"
      }
    ],
    "is_active": true,
    "doctor_specialties": [
      "General Dentistry",
      "Specialized"
    ],
    "doctor_first_name": "Marc kevin",
    "doctor_last_name": "kevs",
    "patient_first_name": null,
    "patient_last_name": null
  },
  {
    "id": "98ffb029-00e3-4bcc-92bd-e60bcf741538",
    "patient_id": "695c7e12-0e1d-4488-b1e7-a1300af5b23b",
    "patient_name": "Chris Ferdrei",
    "patient_email": "chris@gmail.com",
    "patient_phone": "09111111111",
    "patient_sex": "Male",
    "patient_dob": "2008-09-27",
    "is_guest": false,
    "is_for_other": false,
    "other_sex": null,
    "other_dob": null,
    "service_id": "98ffb029-00e3-4bcc-92bd-e60bcf741538",
    "service_name": "Root Canal Treatment",
    "doctor_id": "71e36144-4cf0-4ec8-9344-c9c2255a8451",
    "appointment_date": "2026-04-27",
    "appointment_time": "5:00 PM",
    "duration_minutes": 60,
    "status": "arrived",
    "is_waitlist": false,
    "waitlist_position": null,
    "confirmation_token": null,
    "confirmed_at": null,
    "notes": null,
    "created_at": "2026-04-06 11:10:30.99302+00",
    "updated_at": "2026-04-26 04:06:13.282732+00",
    "email_status": "confirmed",
    "other_first_name": null,
    "other_last_name": null,
    "other_email": null,
    "other_phone": null,
    "slug": "root-canal",
    "category": "Specialized",
    "name": "Root Canal Treatment",
    "tagline": "Save infected teeth from extraction",
    "hero": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=1200",
    "icon": "fa-microscope",
    "summary": "Endodontic therapy to remove infected pulp and save your natural tooth.",
    "duration": "1–2 visits",
    "recovery": "2–3 days",
    "price": "5000.00",
    "benefits": [
      "Saves natural tooth",
      "Relieves pain",
      "Prevents spread",
      "High success rate"
    ],
    "steps": [
      "Local anesthesia",
      "Accessing the pulp",
      "Cleaning & shaping canals",
      "Sealing with Gutta-percha"
    ],
    "faqs": [
      {
        "answer": "Modern techniques make it as comfortable as getting a filling.",
        "question": "Is a root canal painful?"
      },
      {
        "answer": "Usually, yes. A crown is recommended to protect the tooth after the procedure.",
        "question": "Do I need a crown after?"
      }
    ],
    "is_active": true,
    "doctor_specialties": [
      "General Dentistry",
      "Specialized"
    ],
    "doctor_first_name": "Marc kevin",
    "doctor_last_name": "kevs",
    "patient_first_name": "Chris",
    "patient_last_name": "Ferdrei"
  },
  {
    "id": "287d810f-6361-4009-bd80-3161820335d8",
    "patient_id": null,
    "patient_name": "Marc kevin Del Mundo",
    "patient_email": "marckevindelmundo@gmail.com",
    "patient_phone": "+639155473200",
    "patient_sex": "Male",
    "patient_dob": "2015-04-14",
    "is_guest": true,
    "is_for_other": false,
    "other_sex": null,
    "other_dob": null,
    "service_id": "287d810f-6361-4009-bd80-3161820335d8",
    "service_name": "General Dentistry",
    "doctor_id": "d1aeb482-ff6b-4c19-a35a-4399aba89e98",
    "appointment_date": "2026-04-25",
    "appointment_time": "10:00 AM",
    "duration_minutes": 60,
    "status": "confirmed",
    "is_waitlist": false,
    "waitlist_position": null,
    "confirmation_token": "e872baa1996d44a9bbb35712d604d238",
    "confirmed_at": "2026-04-25 13:48:05.237088+00",
    "notes": null,
    "created_at": "2026-04-12 11:53:33.476663+00",
    "updated_at": "2026-04-26 04:30:05.998968+00",
    "email_status": "confirmed",
    "other_first_name": null,
    "other_last_name": null,
    "other_email": null,
    "other_phone": null,
    "slug": "general-dentistry",
    "category": "General Dentistry",
    "name": "General Dentistry",
    "tagline": "Thin porcelain shells for a perfect smile",
    "hero": "https://iglnkxzttnkjnvdzccji.supabase.co/storage/v1/object/public/heroes/service-heroes/6699cd5c-1587-4d2b-b1d1-149fdb53d90f.jpg",
    "icon": "fa-hand-holding-heart",
    "summary": "Keep your smile at its best with our comprehensive general dental care. We focus on prevention and early detection to save you from future discomfort and costly procedures. From thorough cleanings to detailed checkups, we provide the essential care your teeth deserve in a relaxing environment.",
    "duration": "30 - 45 mins",
    "recovery": "None / Immediate",
    "price": "1500.00",
    "benefits": [
      "Prevents cavities and tooth decay.",
      "Early detection of oral health issues.",
      "Professional plaque and tartar removal."
    ],
    "steps": [],
    "faqs": [],
    "is_active": true,
    "doctor_specialties": [
      "General Dentistry",
      "Cosmetic",
      "Specialized"
    ],
    "doctor_first_name": "Lia",
    "doctor_last_name": "Cayabyab",
    "patient_first_name": null,
    "patient_last_name": null
  },
  {
    "id": "df868d7a-4c9f-41c0-b110-671f015185b8",
    "patient_id": null,
    "patient_name": "Marc kevin Del Mundo",
    "patient_email": "delmundo.marckevin.ferolino@gmail.com",
    "patient_phone": "+639155473200",
    "patient_sex": "Male",
    "patient_dob": "2015-07-19",
    "is_guest": true,
    "is_for_other": false,
    "other_sex": null,
    "other_dob": null,
    "service_id": "df868d7a-4c9f-41c0-b110-671f015185b8",
    "service_name": "Dental Veneers",
    "doctor_id": "d1aeb482-ff6b-4c19-a35a-4399aba89e98",
    "appointment_date": "2026-04-21",
    "appointment_time": "4:00 PM",
    "duration_minutes": 60,
    "status": "confirmed",
    "is_waitlist": false,
    "waitlist_position": null,
    "confirmation_token": "b0f7e59ed298460aa745d0bcd82e58dd",
    "confirmed_at": "2026-04-25 13:49:43.072823+00",
    "notes": "Kahit ano",
    "created_at": "2026-04-06 11:10:30+00",
    "updated_at": "2026-04-26 05:18:37.536092+00",
    "email_status": "confirmed",
    "other_first_name": null,
    "other_last_name": null,
    "other_email": null,
    "other_phone": null,
    "slug": "veneers",
    "category": "Cosmetic",
    "name": "Dental Veneers",
    "tagline": "Thin porcelain shells for a perfect smile",
    "hero": "https://riverfrontdental.ca/wp-content/uploads/2024/03/porcelain-veneers.jpg",
    "icon": "fa-gem",
    "summary": "Custom-crafted porcelain veneers that transform the shape, color and size of your teeth.",
    "duration": "2 visits",
    "recovery": "1–2 days",
    "price": "8000.00",
    "benefits": [
      "Natural look",
      "Stain resistant",
      "Long-lasting",
      "Minimal prep"
    ],
    "steps": [
      "Tooth preparation",
      "Impression taking",
      "Temporary veneer placement",
      "Final bonding"
    ],
    "faqs": [
      {
        "answer": "The process is irreversible because enamel is removed. Veneers last 10-15 years.",
        "question": "Are veneers permanent?"
      },
      {
        "answer": "Porcelain is highly resistant to stains from coffee, tea, and tobacco.",
        "question": "Do they stain?"
      }
    ],
    "is_active": true,
    "doctor_specialties": [
      "General Dentistry",
      "Cosmetic",
      "Specialized"
    ],
    "doctor_first_name": "Lia",
    "doctor_last_name": "Cayabyab",
    "patient_first_name": null,
    "patient_last_name": null
  }
]