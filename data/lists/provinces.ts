export interface ProvinceEntry {
  id: string;
  name: string;
  districts: string[];
}

export const PROVINCES: ProvinceEntry[] = [
  {
    id: "koshi",
    name: "Koshi",
    districts: [
      "Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang",
      "Okhaldhunga", "Panchthar", "Sankhuwasabha", "Solukhumbu",
      "Sunsari", "Taplejung", "Terhathum", "Udayapur",
    ],
  },
  {
    id: "madhesh",
    name: "Madhesh",
    districts: [
      "Parsa", "Bara", "Rautahat", "Sarlahi", "Dhanusha", "Siraha",
      "Mahottari", "Saptari",
    ],
  },
  {
    id: "bagmati",
    name: "Bagmati",
    districts: [
      "Sindhuli", "Ramechhap", "Dolakha", "Bhaktapur", "Dhading",
      "Kathmandu", "Kavrepalanchok", "Lalitpur", "Nuwakot", "Rasuwa",
      "Sindhupalchok", "Chitwan", "Makwanpur",
    ],
  },
  {
    id: "gandaki",
    name: "Gandaki",
    districts: [
      "Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang",
      "Myagdi", "Nawalparasi (Bardaghat Susta East)", "Parbat",
      "Syangja", "Tanahu",
    ],
  },
  {
    id: "lumbini",
    name: "Lumbini",
    districts: [
      "Kapilvastu", "Nawalparasi (Bardaghat Susta West)", "Rupandehi",
      "Arghakhanchi", "Gulmi", "Palpa", "Dang", "Pyuthan", "Rolpa",
      "Rukum East", "Banke", "Bardiya",
    ],
  },
  {
    id: "karnali",
    name: "Karnali",
    districts: [
      "Rukum Paschim", "Salyan", "Dolpa", "Humla", "Jumla", "Kalikot",
      "Mugu", "Surkhet", "Dailekh", "Jajarkot",
    ],
  },
  {
    id: "sudurpashchim",
    name: "Sudurpashchim",
    districts: [
      "Kailali", "Achham", "Doti", "Bajhang", "Bajura", "Kanchanpur",
      "Dadeldhura", "Baitadi", "Darchula",
    ],
  },
];
