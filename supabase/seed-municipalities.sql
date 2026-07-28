-- ============================================================================================
-- Seed Script: All 753 Municipalities of Nepal
-- Idempotent: Inserts missing municipalities linked to districts via name lookup
-- ============================================================================================

DO $$
DECLARE
    d_id UUID;
    m_count INT := 0;
BEGIN

    -- District: Achham
    SELECT id INTO d_id FROM districts WHERE name = 'Achham' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mangalsen' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mangalsen', 'contact.mangalsen.achham@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kamalbazar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kamalbazar', 'contact.kamalbazar.achham@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Safebagar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Safebagar', 'contact.safebagar.achham@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Panchadewal Binayak' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Panchadewal Binayak', 'contact.panchadewalbinayak.achham@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dhakari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dhakari', 'contact.dhakari.achham@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ramaroshan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ramaroshan', 'contact.ramaroshan.achham@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bannigadi Jayagad' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bannigadi Jayagad', 'contact.bannigadijayagad.achham@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chaurpati' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chaurpati', 'contact.chaurpati.achham@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mellekh' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mellekh', 'contact.mellekh.achham@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Turmakhad' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Turmakhad', 'contact.turmakhad.achham@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Arghakhanchi
    SELECT id INTO d_id FROM districts WHERE name = 'Arghakhanchi' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sandhikharka' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sandhikharka', 'contact.sandhikharka.arghakhanchi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shitganga' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shitganga', 'contact.shitganga.arghakhanchi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhumikasthan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhumikasthan', 'contact.bhumikasthan.arghakhanchi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chhatradev' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chhatradev', 'contact.chhatradev.arghakhanchi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Panini' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Panini', 'contact.panini.arghakhanchi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Malarani' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Malarani', 'contact.malarani.arghakhanchi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Baglung
    SELECT id INTO d_id FROM districts WHERE name = 'Baglung' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Baglung' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Baglung', 'contact.baglung.baglung@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jaimini' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jaimini', 'contact.jaimini.baglung@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dhorpatan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dhorpatan', 'contact.dhorpatan.baglung@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Galkot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Galkot', 'contact.galkot.baglung@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Badigad' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Badigad', 'contact.badigad.baglung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kathinauala' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kathinauala', 'contact.kathinauala.baglung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tarakhola' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tarakhola', 'contact.tarakhola.baglung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Nisikhola' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Nisikhola', 'contact.nisikhola.baglung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sare' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sare', 'contact.sare.baglung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kathekhola' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kathekhola', 'contact.kathekhola.baglung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Baitadi
    SELECT id INTO d_id FROM districts WHERE name = 'Baitadi' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dasharathchand' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dasharathchand', 'contact.dasharathchand.baitadi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Patan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Patan', 'contact.patan.baitadi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Melouli' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Melouli', 'contact.melouli.baitadi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Puchardi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Puchardi', 'contact.puchardi.baitadi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sigas' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sigas', 'contact.sigas.baitadi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Surnaya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Surnaya', 'contact.surnaya.baitadi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dogadakedar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dogadakedar', 'contact.dogadakedar.baitadi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Pancheshwar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Pancheshwar', 'contact.pancheshwar.baitadi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shivanath' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shivanath', 'contact.shivanath.baitadi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dasharathchand Rural Municipality' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dasharathchand Rural Municipality', 'contact.dasharathchandruralmunicipality.baitadi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Bajhang
    SELECT id INTO d_id FROM districts WHERE name = 'Bajhang' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jaya Prithvi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jaya Prithvi', 'contact.jayaprithvi.bajhang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bajhang Municipality' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bajhang Municipality', 'contact.bajhangmunicipality.bajhang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bungal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bungal', 'contact.bungal.bajhang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kedarsyu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kedarsyu', 'contact.kedarsyu.bajhang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Talakot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Talakot', 'contact.talakot.bajhang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Biththadchir' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Biththadchir', 'contact.biththadchir.bajhang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Surma' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Surma', 'contact.surma.bajhang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chhabis Pathibhera' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chhabis Pathibhera', 'contact.chhabispathibhera.bajhang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kanda' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kanda', 'contact.kanda.bajhang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Masta' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Masta', 'contact.masta.bajhang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Thalara' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Thalara', 'contact.thalara.bajhang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sayal Rural Municipality' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sayal Rural Municipality', 'contact.sayalruralmunicipality.bajhang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Bajura
    SELECT id INTO d_id FROM districts WHERE name = 'Bajura' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Badimalika' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Badimalika', 'contact.badimalika.bajura@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Triveni' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Triveni', 'contact.triveni.bajura@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Budhiganga' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Budhiganga', 'contact.budhiganga.bajura@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Budhinanda' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Budhinanda', 'contact.budhinanda.bajura@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Himali' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Himali', 'contact.himali.bajura@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gaumul' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gaumul', 'contact.gaumul.bajura@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Swamikartik Khapar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Swamikartik Khapar', 'contact.swamikartikkhapar.bajura@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chhededaha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chhededaha', 'contact.chhededaha.bajura@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jagannath' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jagannath', 'contact.jagannath.bajura@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Banke
    SELECT id INTO d_id FROM districts WHERE name = 'Banke' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Nepalgunj' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Nepalgunj', 'contact.nepalgunj.banke@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kohalpur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kohalpur', 'contact.kohalpur.banke@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rapti Sonari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rapti Sonari', 'contact.raptisonari.banke@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Narainapur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Narainapur', 'contact.narainapur.banke@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Duduwa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Duduwa', 'contact.duduwa.banke@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Janaki' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Janaki', 'contact.janaki.banke@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Khajura' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Khajura', 'contact.khajura.banke@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Baijanath' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Baijanath', 'contact.baijanath.banke@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Bara
    SELECT id INTO d_id FROM districts WHERE name = 'Bara' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jitpur Simara' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jitpur Simara', 'contact.jitpursimara.bara@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kalaiya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kalaiya', 'contact.kalaiya.bara@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kolhabi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kolhabi', 'contact.kolhabi.bara@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Nijgadh' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Nijgadh', 'contact.nijgadh.bara@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Simraungadh' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Simraungadh', 'contact.simraungadh.bara@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mahagadhimai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mahagadhimai', 'contact.mahagadhimai.bara@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Parwanipur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Parwanipur', 'contact.parwanipur.bara@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Adarsh Kotwal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Adarsh Kotwal', 'contact.adarshkotwal.bara@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Karaiyamai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Karaiyamai', 'contact.karaiyamai.bara@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Devtal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Devtal', 'contact.devtal.bara@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Feta' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Feta', 'contact.feta.bara@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Suwarna' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Suwarna', 'contact.suwarna.bara@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Parwanipur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Parwanipur', 'contact.parwanipur.bara@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Prasauni' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Prasauni', 'contact.prasauni.bara@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Baragadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Baragadhi', 'contact.baragadhi.bara@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Pacharauta' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Pacharauta', 'contact.pacharauta.bara@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Bardiya
    SELECT id INTO d_id FROM districts WHERE name = 'Bardiya' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gulariya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gulariya', 'contact.gulariya.bardiya@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Madhuwan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Madhuwan', 'contact.madhuwan.bardiya@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rajapur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rajapur', 'contact.rajapur.bardiya@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Thakur Baba' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Thakur Baba', 'contact.thakurbaba.bardiya@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Badhaiyatal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Badhaiyatal', 'contact.badhaiyatal.bardiya@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Barbardiya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Barbardiya', 'contact.barbardiya.bardiya@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Geruwa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Geruwa', 'contact.geruwa.bardiya@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Bhaktapur
    SELECT id INTO d_id FROM districts WHERE name = 'Bhaktapur' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhaktapur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhaktapur', 'contact.bhaktapur.bhaktapur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Madhyapur Thimi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Madhyapur Thimi', 'contact.madhyapurthimi.bhaktapur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Changunarayan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Changunarayan', 'contact.changunarayan.bhaktapur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Suryabinayak' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Suryabinayak', 'contact.suryabinayak.bhaktapur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Bhojpur
    SELECT id INTO d_id FROM districts WHERE name = 'Bhojpur' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhojpur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhojpur', 'contact.bhojpur.bhojpur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shadananda' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shadananda', 'contact.shadananda.bhojpur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tyamke Maiyum' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tyamke Maiyum', 'contact.tyamkemaiyum.bhojpur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Powadumgma' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Powadumgma', 'contact.powadumgma.bhojpur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Arun' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Arun', 'contact.arun.bhojpur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Hatuwagadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Hatuwagadhi', 'contact.hatuwagadhi.bhojpur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Amchok' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Amchok', 'contact.amchok.bhojpur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ramprasad Rai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ramprasad Rai', 'contact.ramprasadrai.bhojpur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Salpasili Chho' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Salpasili Chho', 'contact.salpasilichho.bhojpur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Chitwan
    SELECT id INTO d_id FROM districts WHERE name = 'Chitwan' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bharatpur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bharatpur', 'contact.bharatpur.chitwan@municipality.gov.np', 'metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ratnanagar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ratnanagar', 'contact.ratnanagar.chitwan@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kalika' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kalika', 'contact.kalika.chitwan@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Khairahani' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Khairahani', 'contact.khairahani.chitwan@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Madi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Madi', 'contact.madi.chitwan@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rapti' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rapti', 'contact.rapti.chitwan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ichhakamana' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ichhakamana', 'contact.ichhakamana.chitwan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Dadeldhura
    SELECT id INTO d_id FROM districts WHERE name = 'Dadeldhura' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Amargadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Amargadhi', 'contact.amargadhi.dadeldhura@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Parashuram' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Parashuram', 'contact.parashuram.dadeldhura@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Alital' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Alital', 'contact.alital.dadeldhura@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ganyapdhura' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ganyapdhura', 'contact.ganyapdhura.dadeldhura@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Navadurga' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Navadurga', 'contact.navadurga.dadeldhura@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhageshwar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhageshwar', 'contact.bhageshwar.dadeldhura@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ajaymeru' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ajaymeru', 'contact.ajaymeru.dadeldhura@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Dailekh
    SELECT id INTO d_id FROM districts WHERE name = 'Dailekh' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dullu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dullu', 'contact.dullu.dailekh@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dailekh' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dailekh', 'contact.dailekh.dailekh@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chamunda Bindrasaini' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chamunda Bindrasaini', 'contact.chamundabindrasaini.dailekh@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Naumule' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Naumule', 'contact.naumule.dailekh@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhairabi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhairabi', 'contact.bhairabi.dailekh@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mahabu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mahabu', 'contact.mahabu.dailekh@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Guranse' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Guranse', 'contact.guranse.dailekh@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhagawatimai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhagawatimai', 'contact.bhagawatimai.dailekh@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Thatikandh' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Thatikandh', 'contact.thatikandh.dailekh@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Naumule' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Naumule', 'contact.naumule.dailekh@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Aathbis' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Aathbis', 'contact.aathbis.dailekh@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Dang
    SELECT id INTO d_id FROM districts WHERE name = 'Dang' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ghorahi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ghorahi', 'contact.ghorahi.dang@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tulsipur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tulsipur', 'contact.tulsipur.dang@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Lamahi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Lamahi', 'contact.lamahi.dang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rapti' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rapti', 'contact.rapti.dang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gadhawa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gadhawa', 'contact.gadhawa.dang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Babai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Babai', 'contact.babai.dang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shantinagar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shantinagar', 'contact.shantinagar.dang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dangisharan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dangisharan', 'contact.dangisharan.dang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rajpur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rajpur', 'contact.rajpur.dang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bangalachuli' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bangalachuli', 'contact.bangalachuli.dang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Darchula
    SELECT id INTO d_id FROM districts WHERE name = 'Darchula' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mahakali' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mahakali', 'contact.mahakali.darchula@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shailyashikhar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shailyashikhar', 'contact.shailyashikhar.darchula@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Lekam' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Lekam', 'contact.lekam.darchula@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Duhun' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Duhun', 'contact.duhun.darchula@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Naugad' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Naugad', 'contact.naugad.darchula@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Malika' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Malika', 'contact.malika.darchula@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Api Himal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Api Himal', 'contact.apihimal.darchula@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Marma' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Marma', 'contact.marma.darchula@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Byans' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Byans', 'contact.byans.darchula@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Dhading
    SELECT id INTO d_id FROM districts WHERE name = 'Dhading' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dhunibeshi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dhunibeshi', 'contact.dhunibeshi.dhading@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Nilkantha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Nilkantha', 'contact.nilkantha.dhading@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Khaniyabas' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Khaniyabas', 'contact.khaniyabas.dhading@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Galchhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Galchhi', 'contact.galchhi.dhading@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gangajamuna' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gangajamuna', 'contact.gangajamuna.dhading@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jwalakhel' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jwalakhel', 'contact.jwalakhel.dhading@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Thakre' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Thakre', 'contact.thakre.dhading@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Netravati' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Netravati', 'contact.netravati.dhading@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rubi Valley' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rubi Valley', 'contact.rubivalley.dhading@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Siddhalek' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Siddhalek', 'contact.siddhalek.dhading@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gajuri' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gajuri', 'contact.gajuri.dhading@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Benighat Rorang' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Benighat Rorang', 'contact.benighatrorang.dhading@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ichchakamana' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ichchakamana', 'contact.ichchakamana.dhading@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tipling' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tipling', 'contact.tipling.dhading@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Dhankuta
    SELECT id INTO d_id FROM districts WHERE name = 'Dhankuta' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dhankuta' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dhankuta', 'contact.dhankuta.dhankuta@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Pakhribas' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Pakhribas', 'contact.pakhribas.dhankuta@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mahakali (Chhathar Mahakali)' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mahakali (Chhathar Mahakali)', 'contact.mahakalichhatharmahakali.dhankuta@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chhathar Jorpati' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chhathar Jorpati', 'contact.chhatharjorpati.dhankuta@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sangurigadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sangurigadhi', 'contact.sangurigadhi.dhankuta@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chaubise' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chaubise', 'contact.chaubise.dhankuta@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sahidbhumi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sahidbhumi', 'contact.sahidbhumi.dhankuta@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Dhanusha
    SELECT id INTO d_id FROM districts WHERE name = 'Dhanusha' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Janakpurdham' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Janakpurdham', 'contact.janakpurdham.dhanusha@municipality.gov.np', 'metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dhanushadham' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dhanushadham', 'contact.dhanushadham.dhanusha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mithila' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mithila', 'contact.mithila.dhanusha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bateshwor' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bateshwor', 'contact.bateshwor.dhanusha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kshireshornath' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kshireshornath', 'contact.kshireshornath.dhanusha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kamala' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kamala', 'contact.kamala.dhanusha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shahidnagar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shahidnagar', 'contact.shahidnagar.dhanusha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ganeshman Charnath' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ganeshman Charnath', 'contact.ganeshmancharnath.dhanusha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Hanumannagar Kankalini' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Hanumannagar Kankalini', 'contact.hanumannagarkankalini.dhanusha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Aurahi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Aurahi', 'contact.aurahi.dhanusha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mithila Bihari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mithila Bihari', 'contact.mithilabihari.dhanusha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bideha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bideha', 'contact.bideha.dhanusha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Janaknandini' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Janaknandini', 'contact.janaknandini.dhanusha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Laxminiya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Laxminiya', 'contact.laxminiya.dhanusha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mukhiyapatti Musaharniya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mukhiyapatti Musaharniya', 'contact.mukhiyapattimusaharniya.dhanusha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Aurahi Rural Municipality' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Aurahi Rural Municipality', 'contact.aurahiruralmunicipality.dhanusha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sabaila' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sabaila', 'contact.sabaila.dhanusha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Hansapur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Hansapur', 'contact.hansapur.dhanusha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Dolakha
    SELECT id INTO d_id FROM districts WHERE name = 'Dolakha' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhimeshwor' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhimeshwor', 'contact.bhimeshwor.dolakha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jiri' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jiri', 'contact.jiri.dolakha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kalinchok' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kalinchok', 'contact.kalinchok.dolakha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Melung' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Melung', 'contact.melung.dolakha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Baiteshwar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Baiteshwar', 'contact.baiteshwar.dolakha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sailung' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sailung', 'contact.sailung.dolakha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tamakoshi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tamakoshi', 'contact.tamakoshi.dolakha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gaurishankar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gaurishankar', 'contact.gaurishankar.dolakha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bigu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bigu', 'contact.bigu.dolakha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Dolpa
    SELECT id INTO d_id FROM districts WHERE name = 'Dolpa' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Thuli Bheri' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Thuli Bheri', 'contact.thulibheri.dolpa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dolpo Buddha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dolpo Buddha', 'contact.dolpobuddha.dolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'She Phoksundo' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'She Phoksundo', 'contact.shephoksundo.dolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chharka Tangsong' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chharka Tangsong', 'contact.chharkatangsong.dolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kagkot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kagkot', 'contact.kagkot.dolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mudkechula' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mudkechula', 'contact.mudkechula.dolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jagadulla' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jagadulla', 'contact.jagadulla.dolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tripurasundari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tripurasundari', 'contact.tripurasundari.dolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Doti
    SELECT id INTO d_id FROM districts WHERE name = 'Doti' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shikhar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shikhar', 'contact.shikhar.doti@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dipayal Silgadi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dipayal Silgadi', 'contact.dipayalsilgadi.doti@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Purbichauki' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Purbichauki', 'contact.purbichauki.doti@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Adarsh' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Adarsh', 'contact.adarsh.doti@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jorayal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jorayal', 'contact.jorayal.doti@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Badikedar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Badikedar', 'contact.badikedar.doti@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sayal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sayal', 'contact.sayal.doti@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Purbichauki' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Purbichauki', 'contact.purbichauki.doti@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'K I Singh' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'K I Singh', 'contact.kisingh.doti@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Gorkha
    SELECT id INTO d_id FROM districts WHERE name = 'Gorkha' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gorkha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gorkha', 'contact.gorkha.gorkha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Palungtar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Palungtar', 'contact.palungtar.gorkha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dharche' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dharche', 'contact.dharche.gorkha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chumanubri' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chumanubri', 'contact.chumanubri.gorkha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhimsen Thapa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhimsen Thapa', 'contact.bhimsenthapa.gorkha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Aarughat' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Aarughat', 'contact.aarughat.gorkha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Siranchowk' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Siranchowk', 'contact.siranchowk.gorkha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ajirkot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ajirkot', 'contact.ajirkot.gorkha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shahid Lakhan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shahid Lakhan', 'contact.shahidlakhan.gorkha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gandaki' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gandaki', 'contact.gandaki.gorkha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sullikot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sullikot', 'contact.sullikot.gorkha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Gulmi
    SELECT id INTO d_id FROM districts WHERE name = 'Gulmi' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Resunga' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Resunga', 'contact.resunga.gulmi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Musikot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Musikot', 'contact.musikot.gulmi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Satyawati' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Satyawati', 'contact.satyawati.gulmi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chandrakot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chandrakot', 'contact.chandrakot.gulmi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rupakot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rupakot', 'contact.rupakot.gulmi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gulmi Durbar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gulmi Durbar', 'contact.gulmidurbar.gulmi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kaligandaki' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kaligandaki', 'contact.kaligandaki.gulmi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Malika' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Malika', 'contact.malika.gulmi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dhurkot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dhurkot', 'contact.dhurkot.gulmi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Isma' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Isma', 'contact.isma.gulmi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chatrakot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chatrakot', 'contact.chatrakot.gulmi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Satyawati' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Satyawati', 'contact.satyawati.gulmi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Humla
    SELECT id INTO d_id FROM districts WHERE name = 'Humla' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Simkot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Simkot', 'contact.simkot.humla@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Namkha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Namkha', 'contact.namkha.humla@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kharpunath' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kharpunath', 'contact.kharpunath.humla@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Satyang' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Satyang', 'contact.satyang.humla@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Adanchuli' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Adanchuli', 'contact.adanchuli.humla@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chankheli' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chankheli', 'contact.chankheli.humla@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tajakot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tajakot', 'contact.tajakot.humla@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Ilam
    SELECT id INTO d_id FROM districts WHERE name = 'Ilam' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ilam' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ilam', 'contact.ilam.ilam@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Suryodaya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Suryodaya', 'contact.suryodaya.ilam@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Deumai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Deumai', 'contact.deumai.ilam@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mai', 'contact.mai.ilam@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Phakphokthum' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Phakphokthum', 'contact.phakphokthum.ilam@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chulachuli' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chulachuli', 'contact.chulachuli.ilam@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Maijogmai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Maijogmai', 'contact.maijogmai.ilam@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rong' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rong', 'contact.rong.ilam@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sandakpur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sandakpur', 'contact.sandakpur.ilam@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mangalbare (Unconfirmed Local Level Name/Old VDC Name)' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mangalbare (Unconfirmed Local Level Name/Old VDC Name)', 'contact.mangalbareunconfirmedlocallevelnameoldvdcname.ilam@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Jajarkot
    SELECT id INTO d_id FROM districts WHERE name = 'Jajarkot' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bheri' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bheri', 'contact.bheri.jajarkot@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chhedagad' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chhedagad', 'contact.chhedagad.jajarkot@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shivalaya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shivalaya', 'contact.shivalaya.jajarkot@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kuse' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kuse', 'contact.kuse.jajarkot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Junichande' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Junichande', 'contact.junichande.jajarkot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Barekot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Barekot', 'contact.barekot.jajarkot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Limba' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Limba', 'contact.limba.jajarkot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Jhapa
    SELECT id INTO d_id FROM districts WHERE name = 'Jhapa' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mechinagar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mechinagar', 'contact.mechinagar.jhapa@municipality.gov.np', 'metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Damak' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Damak', 'contact.damak.jhapa@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhadrapur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhadrapur', 'contact.bhadrapur.jhapa@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Birtamod' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Birtamod', 'contact.birtamod.jhapa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shivasatakshi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shivasatakshi', 'contact.shivasatakshi.jhapa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kankai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kankai', 'contact.kankai.jhapa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kamal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kamal', 'contact.kamal.jhapa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gauradaha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gauradaha', 'contact.gauradaha.jhapa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Arjundhara' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Arjundhara', 'contact.arjundhara.jhapa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Haldibari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Haldibari', 'contact.haldibari.jhapa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kachankawal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kachankawal', 'contact.kachankawal.jhapa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Barhadashi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Barhadashi', 'contact.barhadashi.jhapa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jhiljhile' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jhiljhile', 'contact.jhiljhile.jhapa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gauriganj' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gauriganj', 'contact.gauriganj.jhapa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jhapa Rural Municipality' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jhapa Rural Municipality', 'contact.jhaparuralmunicipality.jhapa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Jumla
    SELECT id INTO d_id FROM districts WHERE name = 'Jumla' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chandannath' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chandannath', 'contact.chandannath.jumla@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Guthichaur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Guthichaur', 'contact.guthichaur.jumla@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tatopani' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tatopani', 'contact.tatopani.jumla@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sinja' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sinja', 'contact.sinja.jumla@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Hima' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Hima', 'contact.hima.jumla@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kankasundari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kankasundari', 'contact.kankasundari.jumla@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tila' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tila', 'contact.tila.jumla@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Patarasi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Patarasi', 'contact.patarasi.jumla@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Kailali
    SELECT id INTO d_id FROM districts WHERE name = 'Kailali' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dhangadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dhangadhi', 'contact.dhangadhi.kailali@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Godawari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Godawari', 'contact.godawari.kailali@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Lamki Chuha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Lamki Chuha', 'contact.lamkichuha.kailali@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tikapur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tikapur', 'contact.tikapur.kailali@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ghoda Ghodi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ghoda Ghodi', 'contact.ghodaghodi.kailali@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhawani' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhawani', 'contact.bhawani.kailali@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gauriganga' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gauriganga', 'contact.gauriganga.kailali@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bardagoriya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bardagoriya', 'contact.bardagoriya.kailali@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mohanyal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mohanyal', 'contact.mohanyal.kailali@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kailari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kailari', 'contact.kailari.kailali@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Janaki' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Janaki', 'contact.janaki.kailali@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhatkanda' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhatkanda', 'contact.bhatkanda.kailali@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chure' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chure', 'contact.chure.kailali@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Kalikot
    SELECT id INTO d_id FROM districts WHERE name = 'Kalikot' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Khandachakra' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Khandachakra', 'contact.khandachakra.kalikot@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Raskot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Raskot', 'contact.raskot.kalikot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sannitriveni' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sannitriveni', 'contact.sannitriveni.kalikot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Palata' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Palata', 'contact.palata.kalikot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Subhakalika' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Subhakalika', 'contact.subhakalika.kalikot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Narharinath' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Narharinath', 'contact.narharinath.kalikot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mahabai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mahabai', 'contact.mahabai.kalikot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tilagufa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tilagufa', 'contact.tilagufa.kalikot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Pachaljharana' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Pachaljharana', 'contact.pachaljharana.kalikot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Kanchanpur
    SELECT id INTO d_id FROM districts WHERE name = 'Kanchanpur' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhimdatta' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhimdatta', 'contact.bhimdatta.kanchanpur@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shuklaphanta' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shuklaphanta', 'contact.shuklaphanta.kanchanpur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bedkot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bedkot', 'contact.bedkot.kanchanpur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Beldandi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Beldandi', 'contact.beldandi.kanchanpur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mahakali Municipality' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mahakali Municipality', 'contact.mahakalimunicipality.kanchanpur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Punarbash' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Punarbash', 'contact.punarbash.kanchanpur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Belauri' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Belauri', 'contact.belauri.kanchanpur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Laljhadi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Laljhadi', 'contact.laljhadi.kanchanpur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Krishnapur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Krishnapur', 'contact.krishnapur.kanchanpur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Kapilvastu
    SELECT id INTO d_id FROM districts WHERE name = 'Kapilvastu' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kapilvastu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kapilvastu', 'contact.kapilvastu.kapilvastu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Banganga' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Banganga', 'contact.banganga.kapilvastu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Buddh à¤­à¥‚à¤®à¤¿' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Buddh à¤­à¥‚à¤®à¤¿', 'contact.buddh.kapilvastu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Krishnanagar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Krishnanagar', 'contact.krishnanagar.kapilvastu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Maharajgunj' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Maharajgunj', 'contact.maharajgunj.kapilvastu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shivaraj' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shivaraj', 'contact.shivaraj.kapilvastu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shuddhodhan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shuddhodhan', 'contact.shuddhodhan.kapilvastu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Yashodhara' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Yashodhara', 'contact.yashodhara.kapilvastu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mayadevi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mayadevi', 'contact.mayadevi.kapilvastu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Vijaynagar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Vijaynagar', 'contact.vijaynagar.kapilvastu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Kaski
    SELECT id INTO d_id FROM districts WHERE name = 'Kaski' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Pokhara' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Pokhara', 'contact.pokhara.kaski@municipality.gov.np', 'metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Annapurna' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Annapurna', 'contact.annapurna.kaski@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Machhapuchchhre' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Machhapuchchhre', 'contact.machhapuchchhre.kaski@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rupa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rupa', 'contact.rupa.kaski@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Madi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Madi', 'contact.madi.kaski@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Kathmandu
    SELECT id INTO d_id FROM districts WHERE name = 'Kathmandu' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kathmandu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kathmandu', 'contact.kathmandu.kathmandu@municipality.gov.np', 'metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kirtipur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kirtipur', 'contact.kirtipur.kathmandu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chandragiri' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chandragiri', 'contact.chandragiri.kathmandu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Nagarjun' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Nagarjun', 'contact.nagarjun.kathmandu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tarakeshwor' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tarakeshwor', 'contact.tarakeshwor.kathmandu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gokarneshwar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gokarneshwar', 'contact.gokarneshwar.kathmandu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Budhanilkantha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Budhanilkantha', 'contact.budhanilkantha.kathmandu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tokha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tokha', 'contact.tokha.kathmandu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kageshwari Manohara' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kageshwari Manohara', 'contact.kageshwarimanohara.kathmandu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shankharapur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shankharapur', 'contact.shankharapur.kathmandu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dakshinkali' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dakshinkali', 'contact.dakshinkali.kathmandu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Kavrepalanchok
    SELECT id INTO d_id FROM districts WHERE name = 'Kavrepalanchok' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dhulikhel' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dhulikhel', 'contact.dhulikhel.kavrepalanchok@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Banepa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Banepa', 'contact.banepa.kavrepalanchok@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Panauti' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Panauti', 'contact.panauti.kavrepalanchok@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Namobuddha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Namobuddha', 'contact.namobuddha.kavrepalanchok@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Palanchok' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Palanchok', 'contact.palanchok.kavrepalanchok@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mandandeupur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mandandeupur', 'contact.mandandeupur.kavrepalanchok@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Roshi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Roshi', 'contact.roshi.kavrepalanchok@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Temal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Temal', 'contact.temal.kavrepalanchok@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bethanchok' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bethanchok', 'contact.bethanchok.kavrepalanchok@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mahabharat' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mahabharat', 'contact.mahabharat.kavrepalanchok@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Khanikhola' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Khanikhola', 'contact.khanikhola.kavrepalanchok@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chaurideurali' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chaurideurali', 'contact.chaurideurali.kavrepalanchok@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhumlu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhumlu', 'contact.bhumlu.kavrepalanchok@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Khotang
    SELECT id INTO d_id FROM districts WHERE name = 'Khotang' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Diktel Rupakot Majhuwagadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Diktel Rupakot Majhuwagadhi', 'contact.diktelrupakotmajhuwagadhi.khotang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Halesi Tuwachung' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Halesi Tuwachung', 'contact.halesituwachung.khotang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Khotehang' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Khotehang', 'contact.khotehang.khotang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Diprung Chuichumma' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Diprung Chuichumma', 'contact.diprungchuichumma.khotang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Aiselukharka' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Aiselukharka', 'contact.aiselukharka.khotang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Janta (Jantedhunga)' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Janta (Jantedhunga)', 'contact.jantajantedhunga.khotang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kepilasgadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kepilasgadhi', 'contact.kepilasgadhi.khotang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Barahapokhari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Barahapokhari', 'contact.barahapokhari.khotang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sakela' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sakela', 'contact.sakela.khotang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rupakot Majhuwagadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rupakot Majhuwagadhi', 'contact.rupakotmajhuwagadhi.khotang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Lalitpur
    SELECT id INTO d_id FROM districts WHERE name = 'Lalitpur' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Lalitpur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Lalitpur', 'contact.lalitpur.lalitpur@municipality.gov.np', 'metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Godawari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Godawari', 'contact.godawari.lalitpur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mahalaxmi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mahalaxmi', 'contact.mahalaxmi.lalitpur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Konjyosom' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Konjyosom', 'contact.konjyosom.lalitpur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bagmati' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bagmati', 'contact.bagmati.lalitpur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Phulchoki' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Phulchoki', 'contact.phulchoki.lalitpur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Lamjung
    SELECT id INTO d_id FROM districts WHERE name = 'Lamjung' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Besisahar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Besisahar', 'contact.besisahar.lamjung@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sundarbazar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sundarbazar', 'contact.sundarbazar.lamjung@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rinas' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rinas', 'contact.rinas.lamjung@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'MadhyaNepal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'MadhyaNepal', 'contact.madhyanepal.lamjung@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dudhpokhari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dudhpokhari', 'contact.dudhpokhari.lamjung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Marsyangdi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Marsyangdi', 'contact.marsyangdi.lamjung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dordi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dordi', 'contact.dordi.lamjung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kwholasothar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kwholasothar', 'contact.kwholasothar.lamjung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Mahottari
    SELECT id INTO d_id FROM districts WHERE name = 'Mahottari' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jaleshwor' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jaleshwor', 'contact.jaleshwor.mahottari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Matihani' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Matihani', 'contact.matihani.mahottari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bardibas' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bardibas', 'contact.bardibas.mahottari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhangaha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhangaha', 'contact.bhangaha.mahottari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gaushala' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gaushala', 'contact.gaushala.mahottari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Aurahi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Aurahi', 'contact.aurahi.mahottari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ramgopalpur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ramgopalpur', 'contact.ramgopalpur.mahottari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mahottari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mahottari', 'contact.mahottari.mahottari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Manara Shiswa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Manara Shiswa', 'contact.manarashiswa.mahottari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sonama' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sonama', 'contact.sonama.mahottari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Samsi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Samsi', 'contact.samsi.mahottari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Loharpatti' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Loharpatti', 'contact.loharpatti.mahottari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Pipra' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Pipra', 'contact.pipra.mahottari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gaushala' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gaushala', 'contact.gaushala.mahottari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mahottari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mahottari', 'contact.mahottari.mahottari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Manang
    SELECT id INTO d_id FROM districts WHERE name = 'Manang' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chame' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chame', 'contact.chame.manang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Narpabhumi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Narpabhumi', 'contact.narpabhumi.manang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Manang Ngisyang' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Manang Ngisyang', 'contact.manangngisyang.manang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Nason' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Nason', 'contact.nason.manang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Morang
    SELECT id INTO d_id FROM districts WHERE name = 'Morang' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Biratnagar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Biratnagar', 'contact.biratnagar.morang@municipality.gov.np', 'metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sundar Haraicha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sundar Haraicha', 'contact.sundarharaicha.morang@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Belbari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Belbari', 'contact.belbari.morang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Pathari-Shanischare' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Pathari-Shanischare', 'contact.patharishanischare.morang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rangeli' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rangeli', 'contact.rangeli.morang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Letang-Bhogateni' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Letang-Bhogateni', 'contact.letangbhogateni.morang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Urlabari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Urlabari', 'contact.urlabari.morang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sunbarshi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sunbarshi', 'contact.sunbarshi.morang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Patarishinuwari (Old Name/Merged)' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Patarishinuwari (Old Name/Merged)', 'contact.patarishinuwarioldnamemerged.morang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Budhiganga' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Budhiganga', 'contact.budhiganga.morang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kattari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kattari', 'contact.kattari.morang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dhanpalthan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dhanpalthan', 'contact.dhanpalthan.morang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jahada' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jahada', 'contact.jahada.morang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gramthan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gramthan', 'contact.gramthan.morang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kanepokhari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kanepokhari', 'contact.kanepokhari.morang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kerabari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kerabari', 'contact.kerabari.morang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Miklajung' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Miklajung', 'contact.miklajung.morang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Mugu
    SELECT id INTO d_id FROM districts WHERE name = 'Mugu' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chhayanath Rara' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chhayanath Rara', 'contact.chhayanathrara.mugu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Soru' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Soru', 'contact.soru.mugu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Khatyad' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Khatyad', 'contact.khatyad.mugu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mugum Karmarong' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mugum Karmarong', 'contact.mugumkarmarong.mugu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Mustang
    SELECT id INTO d_id FROM districts WHERE name = 'Mustang' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gharpajhong' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gharpajhong', 'contact.gharpajhong.mustang@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Thasang' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Thasang', 'contact.thasang.mustang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Damodarkunda Himal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Damodarkunda Himal', 'contact.damodarkundahimal.mustang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Lo-Ghekar Damodarkunda' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Lo-Ghekar Damodarkunda', 'contact.loghekardamodarkunda.mustang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Lomanthang' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Lomanthang', 'contact.lomanthang.mustang@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Myagdi
    SELECT id INTO d_id FROM districts WHERE name = 'Myagdi' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Beni' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Beni', 'contact.beni.myagdi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dhaulagiri' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dhaulagiri', 'contact.dhaulagiri.myagdi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mangala' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mangala', 'contact.mangala.myagdi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Malika' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Malika', 'contact.malika.myagdi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Raghuganga' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Raghuganga', 'contact.raghuganga.myagdi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Annapurna' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Annapurna', 'contact.annapurna.myagdi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Nawalparasi (Bardaghat Susta East)
    SELECT id INTO d_id FROM districts WHERE name = 'Nawalparasi (Bardaghat Susta East)' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kawassoti' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kawassoti', 'contact.kawassoti.nawalparasibardaghatsustaeast@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Madhyabindu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Madhyabindu', 'contact.madhyabindu.nawalparasibardaghatsustaeast@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Devchuli' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Devchuli', 'contact.devchuli.nawalparasibardaghatsustaeast@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gaindakot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gaindakot', 'contact.gaindakot.nawalparasibardaghatsustaeast@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bulingtar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bulingtar', 'contact.bulingtar.nawalparasibardaghatsustaeast@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Baudikali' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Baudikali', 'contact.baudikali.nawalparasibardaghatsustaeast@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Hupsekot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Hupsekot', 'contact.hupsekot.nawalparasibardaghatsustaeast@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Binayi Tribeni' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Binayi Tribeni', 'contact.binayitribeni.nawalparasibardaghatsustaeast@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Nawalparasi (Bardaghat Susta West)
    SELECT id INTO d_id FROM districts WHERE name = 'Nawalparasi (Bardaghat Susta West)' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bardaghat' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bardaghat', 'contact.bardaghat.nawalparasibardaghatsustawest@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ramgram' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ramgram', 'contact.ramgram.nawalparasibardaghatsustawest@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sunwal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sunwal', 'contact.sunwal.nawalparasibardaghatsustawest@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Palhinandan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Palhinandan', 'contact.palhinandan.nawalparasibardaghatsustawest@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Pratappur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Pratappur', 'contact.pratappur.nawalparasibardaghatsustawest@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sarawal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sarawal', 'contact.sarawal.nawalparasibardaghatsustawest@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Susta' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Susta', 'contact.susta.nawalparasibardaghatsustawest@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Nuwakot
    SELECT id INTO d_id FROM districts WHERE name = 'Nuwakot' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bidur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bidur', 'contact.bidur.nuwakot@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Belkotgadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Belkotgadhi', 'contact.belkotgadhi.nuwakot@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kakani' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kakani', 'contact.kakani.nuwakot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tadi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tadi', 'contact.tadi.nuwakot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shivapuri' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shivapuri', 'contact.shivapuri.nuwakot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Likhu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Likhu', 'contact.likhu.nuwakot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Myagang' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Myagang', 'contact.myagang.nuwakot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Panchakanya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Panchakanya', 'contact.panchakanya.nuwakot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Suryagadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Suryagadhi', 'contact.suryagadhi.nuwakot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tandrang' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tandrang', 'contact.tandrang.nuwakot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dupcheshwar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dupcheshwar', 'contact.dupcheshwar.nuwakot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kispang' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kispang', 'contact.kispang.nuwakot@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Okhaldhunga
    SELECT id INTO d_id FROM districts WHERE name = 'Okhaldhunga' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Siddhicharan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Siddhicharan', 'contact.siddhicharan.okhaldhunga@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Manebhanjyang' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Manebhanjyang', 'contact.manebhanjyang.okhaldhunga@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chishankhugadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chishankhugadhi', 'contact.chishankhugadhi.okhaldhunga@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Likhu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Likhu', 'contact.likhu.okhaldhunga@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Molung' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Molung', 'contact.molung.okhaldhunga@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sunkoshi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sunkoshi', 'contact.sunkoshi.okhaldhunga@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Likhu Rural Municipality' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Likhu Rural Municipality', 'contact.likhururalmunicipality.okhaldhunga@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Champadevi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Champadevi', 'contact.champadevi.okhaldhunga@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Palpa
    SELECT id INTO d_id FROM districts WHERE name = 'Palpa' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tansen' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tansen', 'contact.tansen.palpa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rampur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rampur', 'contact.rampur.palpa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rambha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rambha', 'contact.rambha.palpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Purba Khola' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Purba Khola', 'contact.purbakhola.palpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mathagadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mathagadhi', 'contact.mathagadhi.palpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tinau' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tinau', 'contact.tinau.palpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Nisdi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Nisdi', 'contact.nisdi.palpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Satyawati' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Satyawati', 'contact.satyawati.palpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bagnaskali' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bagnaskali', 'contact.bagnaskali.palpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ribdikot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ribdikot', 'contact.ribdikot.palpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Panchthar
    SELECT id INTO d_id FROM districts WHERE name = 'Panchthar' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Phidim' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Phidim', 'contact.phidim.panchthar@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Phalgulanda' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Phalgulanda', 'contact.phalgulanda.panchthar@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Hilihang' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Hilihang', 'contact.hilihang.panchthar@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kummayak' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kummayak', 'contact.kummayak.panchthar@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tumbewa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tumbewa', 'contact.tumbewa.panchthar@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Yangwarak' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Yangwarak', 'contact.yangwarak.panchthar@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Miklajung' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Miklajung', 'contact.miklajung.panchthar@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Phalelung' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Phalelung', 'contact.phalelung.panchthar@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Parbat
    SELECT id INTO d_id FROM districts WHERE name = 'Parbat' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kushma' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kushma', 'contact.kushma.parbat@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Phalewas' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Phalewas', 'contact.phalewas.parbat@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jaljala' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jaljala', 'contact.jaljala.parbat@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mahashila' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mahashila', 'contact.mahashila.parbat@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Paiyun' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Paiyun', 'contact.paiyun.parbat@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Modi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Modi', 'contact.modi.parbat@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bihadi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bihadi', 'contact.bihadi.parbat@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Parsa
    SELECT id INTO d_id FROM districts WHERE name = 'Parsa' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Birgunj' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Birgunj', 'contact.birgunj.parsa@municipality.gov.np', 'metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Pokhariya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Pokhariya', 'contact.pokhariya.parsa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Parsagadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Parsagadhi', 'contact.parsagadhi.parsa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bahudarmai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bahudarmai', 'contact.bahudarmai.parsa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Parsagadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Parsagadhi', 'contact.parsagadhi.parsa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jira Bhawani' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jira Bhawani', 'contact.jirabhawani.parsa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sakhuwa Prasauni' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sakhuwa Prasauni', 'contact.sakhuwaprasauni.parsa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Thori' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Thori', 'contact.thori.parsa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kalikamai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kalikamai', 'contact.kalikamai.parsa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Paterwa Sugauli' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Paterwa Sugauli', 'contact.paterwasugauli.parsa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chhipaharmai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chhipaharmai', 'contact.chhipaharmai.parsa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jagarnathpur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jagarnathpur', 'contact.jagarnathpur.parsa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bindabasini' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bindabasini', 'contact.bindabasini.parsa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dhobini' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dhobini', 'contact.dhobini.parsa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Pyuthan
    SELECT id INTO d_id FROM districts WHERE name = 'Pyuthan' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Pyuthan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Pyuthan', 'contact.pyuthan.pyuthan@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Swargadwari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Swargadwari', 'contact.swargadwari.pyuthan@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gaumukhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gaumukhi', 'contact.gaumukhi.pyuthan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jhimruk' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jhimruk', 'contact.jhimruk.pyuthan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mandavi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mandavi', 'contact.mandavi.pyuthan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Airawati' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Airawati', 'contact.airawati.pyuthan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mallarani' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mallarani', 'contact.mallarani.pyuthan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Naubahini' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Naubahini', 'contact.naubahini.pyuthan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sarumarani' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sarumarani', 'contact.sarumarani.pyuthan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Ramechhap
    SELECT id INTO d_id FROM districts WHERE name = 'Ramechhap' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Manthali' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Manthali', 'contact.manthali.ramechhap@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ramechhap' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ramechhap', 'contact.ramechhap.ramechhap@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Khandadevi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Khandadevi', 'contact.khandadevi.ramechhap@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Umakuinda' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Umakuinda', 'contact.umakuinda.ramechhap@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gokulganga' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gokulganga', 'contact.gokulganga.ramechhap@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Doramba' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Doramba', 'contact.doramba.ramechhap@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sunapati' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sunapati', 'contact.sunapati.ramechhap@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Likhu Tamakoshi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Likhu Tamakoshi', 'contact.likhutamakoshi.ramechhap@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Rasuwa
    SELECT id INTO d_id FROM districts WHERE name = 'Rasuwa' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Uttargaya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Uttargaya', 'contact.uttargaya.rasuwa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kalika' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kalika', 'contact.kalika.rasuwa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gosaikunda' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gosaikunda', 'contact.gosaikunda.rasuwa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Aamachhodingmo' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Aamachhodingmo', 'contact.aamachhodingmo.rasuwa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Temal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Temal', 'contact.temal.rasuwa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gosaikunda' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gosaikunda', 'contact.gosaikunda.rasuwa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Amachhodingmo' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Amachhodingmo', 'contact.amachhodingmo.rasuwa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Uttargaya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Uttargaya', 'contact.uttargaya.rasuwa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kalika' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kalika', 'contact.kalika.rasuwa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Naukunda' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Naukunda', 'contact.naukunda.rasuwa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Rautahat
    SELECT id INTO d_id FROM districts WHERE name = 'Rautahat' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gaur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gaur', 'contact.gaur.rautahat@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chandrapur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chandrapur', 'contact.chandrapur.rautahat@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Garuda' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Garuda', 'contact.garuda.rautahat@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Katahariya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Katahariya', 'contact.katahariya.rautahat@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dewahi Gonahi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dewahi Gonahi', 'contact.dewahigonahi.rautahat@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ishnath' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ishnath', 'contact.ishnath.rautahat@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Baudhimai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Baudhimai', 'contact.baudhimai.rautahat@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rajdevi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rajdevi', 'contact.rajdevi.rautahat@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Madhavnarayan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Madhavnarayan', 'contact.madhavnarayan.rautahat@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gujara' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gujara', 'contact.gujara.rautahat@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Fatuwa Vijaypur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Fatuwa Vijaypur', 'contact.fatuwavijaypur.rautahat@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rautahat' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rautahat', 'contact.rautahat.rautahat@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dewahi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dewahi', 'contact.dewahi.rautahat@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Pratappur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Pratappur', 'contact.pratappur.rautahat@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Brindaban' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Brindaban', 'contact.brindaban.rautahat@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Parsa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Parsa', 'contact.parsa.rautahat@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Rolpa
    SELECT id INTO d_id FROM districts WHERE name = 'Rolpa' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rolpa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rolpa', 'contact.rolpa.rolpa@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Triveni' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Triveni', 'contact.triveni.rolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Paribartan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Paribartan', 'contact.paribartan.rolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Madi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Madi', 'contact.madi.rolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gangadev' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gangadev', 'contact.gangadev.rolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sunchhahari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sunchhahari', 'contact.sunchhahari.rolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Thabang' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Thabang', 'contact.thabang.rolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Lungri' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Lungri', 'contact.lungri.rolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rolpa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rolpa', 'contact.rolpa.rolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Suvarnawati' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Suvarnawati', 'contact.suvarnawati.rolpa@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Rukum East
    SELECT id INTO d_id FROM districts WHERE name = 'Rukum East' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhume' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhume', 'contact.bhume.rukumeast@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sisne' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sisne', 'contact.sisne.rukumeast@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Putha Uttarganga' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Putha Uttarganga', 'contact.puthauttarganga.rukumeast@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Rukum Paschim
    SELECT id INTO d_id FROM districts WHERE name = 'Rukum Paschim' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Musikot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Musikot', 'contact.musikot.rukumpaschim@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Aathbiskot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Aathbiskot', 'contact.aathbiskot.rukumpaschim@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chaurjahari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chaurjahari', 'contact.chaurjahari.rukumpaschim@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bafikot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bafikot', 'contact.bafikot.rukumpaschim@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Triveni' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Triveni', 'contact.triveni.rukumpaschim@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sanibheri' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sanibheri', 'contact.sanibheri.rukumpaschim@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Rupandehi
    SELECT id INTO d_id FROM districts WHERE name = 'Rupandehi' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Butwal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Butwal', 'contact.butwal.rupandehi@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Siddharthanagar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Siddharthanagar', 'contact.siddharthanagar.rupandehi@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tilottama' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tilottama', 'contact.tilottama.rupandehi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sainamaina' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sainamaina', 'contact.sainamaina.rupandehi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Devdaha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Devdaha', 'contact.devdaha.rupandehi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Lumbini Sanskritik' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Lumbini Sanskritik', 'contact.lumbinisanskritik.rupandehi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rohini' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rohini', 'contact.rohini.rupandehi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Omsatiya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Omsatiya', 'contact.omsatiya.rupandehi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mayadevi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mayadevi', 'contact.mayadevi.rupandehi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kotahimai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kotahimai', 'contact.kotahimai.rupandehi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Marchawari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Marchawari', 'contact.marchawari.rupandehi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Suddhodhan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Suddhodhan', 'contact.suddhodhan.rupandehi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Siyari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Siyari', 'contact.siyari.rupandehi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gaidahawa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gaidahawa', 'contact.gaidahawa.rupandehi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kanchan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kanchan', 'contact.kanchan.rupandehi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ramroshan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ramroshan', 'contact.ramroshan.rupandehi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Salyan
    SELECT id INTO d_id FROM districts WHERE name = 'Salyan' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sharada' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sharada', 'contact.sharada.salyan@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bangad Kupinde' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bangad Kupinde', 'contact.bangadkupinde.salyan@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bagchaur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bagchaur', 'contact.bagchaur.salyan@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kalimati' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kalimati', 'contact.kalimati.salyan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kapurkot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kapurkot', 'contact.kapurkot.salyan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Siddhakumakh' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Siddhakumakh', 'contact.siddhakumakh.salyan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Triveni' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Triveni', 'contact.triveni.salyan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Darma' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Darma', 'contact.darma.salyan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kumakh' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kumakh', 'contact.kumakh.salyan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chatreshwari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chatreshwari', 'contact.chatreshwari.salyan@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Sankhuwasabha
    SELECT id INTO d_id FROM districts WHERE name = 'Sankhuwasabha' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Khandbari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Khandbari', 'contact.khandbari.sankhuwasabha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dharmadevi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dharmadevi', 'contact.dharmadevi.sankhuwasabha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chainpur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chainpur', 'contact.chainpur.sankhuwasabha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Madi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Madi', 'contact.madi.sankhuwasabha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Panchkhapan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Panchkhapan', 'contact.panchkhapan.sankhuwasabha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhotkhola' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhotkhola', 'contact.bhotkhola.sankhuwasabha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Makalu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Makalu', 'contact.makalu.sankhuwasabha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chichila' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chichila', 'contact.chichila.sankhuwasabha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Simring (Silichong)' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Simring (Silichong)', 'contact.simringsilichong.sankhuwasabha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sabapokhari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sabapokhari', 'contact.sabapokhari.sankhuwasabha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Saptari
    SELECT id INTO d_id FROM districts WHERE name = 'Saptari' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rajbiraj' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rajbiraj', 'contact.rajbiraj.saptari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kanchanrup' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kanchanrup', 'contact.kanchanrup.saptari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Saptakoshi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Saptakoshi', 'contact.saptakoshi.saptari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Hanumannagar Kankalini' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Hanumannagar Kankalini', 'contact.hanumannagarkankalini.saptari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shambhunath' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shambhunath', 'contact.shambhunath.saptari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tilathi Koiladi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tilathi Koiladi', 'contact.tilathikoiladi.saptari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dakneshwari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dakneshwari', 'contact.dakneshwari.saptari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Agnisair Krishna Sawaran' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Agnisair Krishna Sawaran', 'contact.agnisairkrishnasawaran.saptari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bodebarsain' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bodebarsain', 'contact.bodebarsain.saptari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Balan Bihul' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Balan Bihul', 'contact.balanbihul.saptari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chhinnamasta' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chhinnamasta', 'contact.chhinnamasta.saptari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mahadeva' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mahadeva', 'contact.mahadeva.saptari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Belhi Chapena' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Belhi Chapena', 'contact.belhichapena.saptari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tirhut' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tirhut', 'contact.tirhut.saptari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rupni' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rupni', 'contact.rupni.saptari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Surunga (Kanchanrup)' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Surunga (Kanchanrup)', 'contact.surungakanchanrup.saptari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bishnupur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bishnupur', 'contact.bishnupur.saptari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sapahi (Bodebarsain)' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sapahi (Bodebarsain)', 'contact.sapahibodebarsain.saptari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Sarlahi
    SELECT id INTO d_id FROM districts WHERE name = 'Sarlahi' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Malangwa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Malangwa', 'contact.malangwa.sarlahi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Hariwan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Hariwan', 'contact.hariwan.sarlahi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Lalbandi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Lalbandi', 'contact.lalbandi.sarlahi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ishwarpur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ishwarpur', 'contact.ishwarpur.sarlahi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Barahathwa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Barahathwa', 'contact.barahathwa.sarlahi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gaushala' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gaushala', 'contact.gaushala.sarlahi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kaudiya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kaudiya', 'contact.kaudiya.sarlahi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Balara' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Balara', 'contact.balara.sarlahi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chandranagar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chandranagar', 'contact.chandranagar.sarlahi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Basbaria' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Basbaria', 'contact.basbaria.sarlahi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Godaita' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Godaita', 'contact.godaita.sarlahi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Haripurwa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Haripurwa', 'contact.haripurwa.sarlahi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kabilasi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kabilasi', 'contact.kabilasi.sarlahi@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dhankaul' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dhankaul', 'contact.dhankaul.sarlahi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chakraghatta' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chakraghatta', 'contact.chakraghatta.sarlahi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Basbaria' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Basbaria', 'contact.basbaria.sarlahi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ramnagar Bahuarwa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ramnagar Bahuarwa', 'contact.ramnagarbahuarwa.sarlahi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bishnu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bishnu', 'contact.bishnu.sarlahi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Parsa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Parsa', 'contact.parsa.sarlahi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Brahmapuri' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Brahmapuri', 'contact.brahmapuri.sarlahi@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Sindhuli
    SELECT id INTO d_id FROM districts WHERE name = 'Sindhuli' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kamalamai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kamalamai', 'contact.kamalamai.sindhuli@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dudhauli' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dudhauli', 'contact.dudhauli.sindhuli@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Fikkal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Fikkal', 'contact.fikkal.sindhuli@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ghyanglekh' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ghyanglekh', 'contact.ghyanglekh.sindhuli@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tesrole' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tesrole', 'contact.tesrole.sindhuli@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Marin' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Marin', 'contact.marin.sindhuli@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Golanchour' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Golanchour', 'contact.golanchour.sindhuli@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sunkoshi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sunkoshi', 'contact.sunkoshi.sindhuli@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tinpatan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tinpatan', 'contact.tinpatan.sindhuli@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Sindhupalchok
    SELECT id INTO d_id FROM districts WHERE name = 'Sindhupalchok' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chautara Sangachokgadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chautara Sangachokgadhi', 'contact.chautarasangachokgadhi.sindhupalchok@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Barhabise' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Barhabise', 'contact.barhabise.sindhupalchok@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhotekoshi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhotekoshi', 'contact.bhotekoshi.sindhupalchok@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Melamchi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Melamchi', 'contact.melamchi.sindhupalchok@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sunkoshi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sunkoshi', 'contact.sunkoshi.sindhupalchok@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Tripurasundari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Tripurasundari', 'contact.tripurasundari.sindhupalchok@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Indrawati' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Indrawati', 'contact.indrawati.sindhupalchok@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Jugal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Jugal', 'contact.jugal.sindhupalchok@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Panchpokhari Thangpal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Panchpokhari Thangpal', 'contact.panchpokharithangpal.sindhupalchok@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Balefi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Balefi', 'contact.balefi.sindhupalchok@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Lisankhu Pakhar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Lisankhu Pakhar', 'contact.lisankhupakhar.sindhupalchok@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Helambu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Helambu', 'contact.helambu.sindhupalchok@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Siraha
    SELECT id INTO d_id FROM districts WHERE name = 'Siraha' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Siraha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Siraha', 'contact.siraha.siraha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dhangadhimai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dhangadhimai', 'contact.dhangadhimai.siraha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Lahan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Lahan', 'contact.lahan.siraha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kalyanpur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kalyanpur', 'contact.kalyanpur.siraha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sukhipur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sukhipur', 'contact.sukhipur.siraha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Golbazar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Golbazar', 'contact.golbazar.siraha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mirchaiya' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mirchaiya', 'contact.mirchaiya.siraha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Karjanha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Karjanha', 'contact.karjanha.siraha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Lagnagadi (Lahan)' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Lagnagadi (Lahan)', 'contact.lagnagadilahan.siraha@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bardibas' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bardibas', 'contact.bardibas.siraha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Laxmipur Patari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Laxmipur Patari', 'contact.laxmipurpatari.siraha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Navarajpur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Navarajpur', 'contact.navarajpur.siraha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bishnupur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bishnupur', 'contact.bishnupur.siraha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Arnma' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Arnma', 'contact.arnma.siraha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Aurahi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Aurahi', 'contact.aurahi.siraha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sakhuwanankarkatti' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sakhuwanankarkatti', 'contact.sakhuwanankarkatti.siraha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Naraha' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Naraha', 'contact.naraha.siraha@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Solukhumbu
    SELECT id INTO d_id FROM districts WHERE name = 'Solukhumbu' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Solududhkunda' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Solududhkunda', 'contact.solududhkunda.solukhumbu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Khumbu Pasanglhamu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Khumbu Pasanglhamu', 'contact.khumbupasanglhamu.solukhumbu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dudhkoshi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dudhkoshi', 'contact.dudhkoshi.solukhumbu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Thulung Dudhkoshi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Thulung Dudhkoshi', 'contact.thulungdudhkoshi.solukhumbu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Necha Salyan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Necha Salyan', 'contact.nechasalyan.solukhumbu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mahakulung' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mahakulung', 'contact.mahakulung.solukhumbu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Likhu Pike' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Likhu Pike', 'contact.likhupike.solukhumbu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sotang' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sotang', 'contact.sotang.solukhumbu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Sunsari
    SELECT id INTO d_id FROM districts WHERE name = 'Sunsari' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dharan' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dharan', 'contact.dharan.sunsari@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Itahari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Itahari', 'contact.itahari.sunsari@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Inaruwa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Inaruwa', 'contact.inaruwa.sunsari@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Duhabi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Duhabi', 'contact.duhabi.sunsari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ramdhuni-Bhasina' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ramdhuni-Bhasina', 'contact.ramdhunibhasina.sunsari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Barahakshetra' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Barahakshetra', 'contact.barahakshetra.sunsari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Koshi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Koshi', 'contact.koshi.sunsari@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gadhi', 'contact.gadhi.sunsari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Dewanganj' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Dewanganj', 'contact.dewanganj.sunsari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhokaha Narsingh' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhokaha Narsingh', 'contact.bhokahanarsingh.sunsari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Harinagar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Harinagar', 'contact.harinagar.sunsari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Barju' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Barju', 'contact.barju.sunsari@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Surkhet
    SELECT id INTO d_id FROM districts WHERE name = 'Surkhet' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Birendranagar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Birendranagar', 'contact.birendranagar.surkhet@municipality.gov.np', 'sub_metropolitan_city', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bheriganga' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bheriganga', 'contact.bheriganga.surkhet@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Gurbhakot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Gurbhakot', 'contact.gurbhakot.surkhet@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Panchapuri' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Panchapuri', 'contact.panchapuri.surkhet@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Lekbesi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Lekbesi', 'contact.lekbesi.surkhet@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chingad' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chingad', 'contact.chingad.surkhet@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Barahatal' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Barahatal', 'contact.barahatal.surkhet@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chaukune' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chaukune', 'contact.chaukune.surkhet@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Simta' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Simta', 'contact.simta.surkhet@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Syangja
    SELECT id INTO d_id FROM districts WHERE name = 'Syangja' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Putalibazar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Putalibazar', 'contact.putalibazar.syangja@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhirkot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhirkot', 'contact.bhirkot.syangja@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Galyang' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Galyang', 'contact.galyang.syangja@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chapakot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chapakot', 'contact.chapakot.syangja@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Waling' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Waling', 'contact.waling.syangja@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Phedikhola' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Phedikhola', 'contact.phedikhola.syangja@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Aandhikhola' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Aandhikhola', 'contact.aandhikhola.syangja@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Biruwa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Biruwa', 'contact.biruwa.syangja@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Harinas' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Harinas', 'contact.harinas.syangja@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Arjunchaupari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Arjunchaupari', 'contact.arjunchaupari.syangja@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Kaligandaki' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Kaligandaki', 'contact.kaligandaki.syangja@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Tanahu
    SELECT id INTO d_id FROM districts WHERE name = 'Tanahu' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Byas' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Byas', 'contact.byas.tanahu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Shuklagandaki' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Shuklagandaki', 'contact.shuklagandaki.tanahu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhanu' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhanu', 'contact.bhanu.tanahu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bhirkot' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bhirkot', 'contact.bhirkot.tanahu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Devghat' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Devghat', 'contact.devghat.tanahu@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rishing' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rishing', 'contact.rishing.tanahu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Ghiring' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Ghiring', 'contact.ghiring.tanahu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Myagde' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Myagde', 'contact.myagde.tanahu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Bandipur' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Bandipur', 'contact.bandipur.tanahu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Aanbukhaireni' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Aanbukhaireni', 'contact.aanbukhaireni.tanahu@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Taplejung
    SELECT id INTO d_id FROM districts WHERE name = 'Taplejung' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Phungling' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Phungling', 'contact.phungling.taplejung@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Aathrai Tribeni' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Aathrai Tribeni', 'contact.aathraitribeni.taplejung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Phaktanglung' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Phaktanglung', 'contact.phaktanglung.taplejung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Meringden' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Meringden', 'contact.meringden.taplejung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Mikkwa Khola' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Mikkwa Khola', 'contact.mikkwakhola.taplejung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Maiwakhola' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Maiwakhola', 'contact.maiwakhola.taplejung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sidingwa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sidingwa', 'contact.sidingwa.taplejung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Pathibhara Yangwarak' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Pathibhara Yangwarak', 'contact.pathibharayangwarak.taplejung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Siringa' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Siringa', 'contact.siringa.taplejung@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Terhathum
    SELECT id INTO d_id FROM districts WHERE name = 'Terhathum' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Myanglung' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Myanglung', 'contact.myanglung.terhathum@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Laligurans' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Laligurans', 'contact.laligurans.terhathum@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Phedap' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Phedap', 'contact.phedap.terhathum@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Athrai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Athrai', 'contact.athrai.terhathum@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Chhathar' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Chhathar', 'contact.chhathar.terhathum@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Menchhayem' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Menchhayem', 'contact.menchhayem.terhathum@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    -- District: Udayapur
    SELECT id INTO d_id FROM districts WHERE name = 'Udayapur' LIMIT 1;
    IF d_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Triyuga' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Triyuga', 'contact.triyuga.udayapur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Katari' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Katari', 'contact.katari.udayapur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Beltar Bashaha (Chaudandigadhi)' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Beltar Bashaha (Chaudandigadhi)', 'contact.beltarbashahachaudandigadhi.udayapur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Belaka' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Belaka', 'contact.belaka.udayapur@municipality.gov.np', 'municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Rautamai' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Rautamai', 'contact.rautamai.udayapur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Limbuse (Tapli)' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Limbuse (Tapli)', 'contact.limbusetapli.udayapur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Udayapurgadhi' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Udayapurgadhi', 'contact.udayapurgadhi.udayapur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM municipalities WHERE official_name = 'Sasurali (Sunkoshi)' AND district_id = d_id) THEN
            INSERT INTO municipalities (district_id, official_name, official_email, local_level_type, total_wards, is_active)
            VALUES (d_id, 'Sasurali (Sunkoshi)', 'contact.sasuralisunkoshi.udayapur@municipality.gov.np', 'rural_municipality', 9, FALSE);
            m_count := m_count + 1;
        END IF;
    END IF;

    RAISE NOTICE 'Seeded % new municipalities.', m_count;
END $$;
