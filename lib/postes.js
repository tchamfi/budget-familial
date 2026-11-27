// Noms français des postes Finary et icône de chaque poste.

// Finary ne donne pas toujours le nom français d'une sous-catégorie : on part du nôtre, puis du sien.
export const SOUS_CAT_FR = {
  groceries: "Courses", dining_out: "Restaurants", fast_food: "Restauration rapide et livraison", coffee_shop: "Cafés", snacks: "En-cas", alcohol_and_bars: "Bars",
  fuel: "Carburant", repairs: "Entretien et réparations", public_transport: "Transports en commun", taxi: "Taxi et VTC", parking: "Stationnement", insurance: "Assurance auto",
  tolls: "Péages", train_tickets: "Train", plane_tickets: "Avion", car_rental: "Location de voiture", car_wash: "Lavage",
  electricity: "Électricité", water: "Eau", internet: "Internet", mobile_phone: "Téléphone mobile", heating: "Chauffage", trash_and_recycling: "Ordures", bills_subscriptions: "Abonnements et contrats",
  subscriptions: "Abonnements", sports_and_recreation: "Sport", movie_and_theater: "Cinéma et spectacles", hobbies: "Loisirs", vacations: "Vacances", art_and_museum: "Musées",
  medication: "Pharmacie", doctor_visit: "Médecin", dentist_visit: "Dentiste", health_insurance: "Mutuelle", optician: "Opticien", medical_equipment: "Matériel médical",
  clothing: "Vêtements", personal_care: "Soins et beauté", childcare: "Garde d'enfants", education: "Scolarité", tuition: "Frais de scolarité", personal_gifts: "Cadeaux",
  pets: "Animaux", supplies: "Maison", rent: "Loyer", tobacco: "Tabac", student_housing: "Logement étudiant",
  bank_fees: "Frais bancaires", late_fees: "Pénalités", service_charge: "Frais de service",
  internal_transfer: "Virements internes", external_transfer: "Virement à un tiers", gifts_transfer: "Dons et cadeaux", bill_payment: "Paiement de factures", international_transfer: "Transfert international",
  online_services: "Services en ligne", professional_services: "Services pro", withdrawal: "Retraits", income_taxes: "Impôt sur le revenu", property_taxes: "Taxe foncière", social_contributions: "Cotisations sociales",
};
export const CAT_FR = {
  food_and_beverage: "Alimentation", auto_and_transport: "Auto et transports", bills_and_utilities: "Factures et charges", leasure_and_entertainment: "Loisirs",
  healthcare: "Santé", personal_and_home_essentials: "Besoins essentiels", fees: "Frais", taxes: "Impôts", transfer: "Virements", investment: "Placements",
  income: "Revenus", refunds: "Remboursements", loan_payment: "Prêt", loan_payments: "Assurance du prêt", business_and_work: "Travail", shopping: "Achats",
};

export const sousCatLabel = (t) => (t.sous_categorie ? SOUS_CAT_FR[t.sous_categorie] || t.sous_categorie_libelle || t.sous_categorie : null);
export const catLabel = (t) => t.categorie_libelle || CAT_FR[t.categorie] || t.categorie || "Sans catégorie";
// Nom court d'un poste : la sous-catégorie si elle existe, sinon la catégorie.
export const posteCourt = (t) => sousCatLabel(t) || catLabel(t);
// Nom complet, pour l'assistant : « catégorie › sous-catégorie ».
export const posteLabel = (t) => {
  const sc = sousCatLabel(t);
  return sc ? `${catLabel(t)} › ${sc}` : catLabel(t);
};

const ICONES = {
  food_and_beverage: ["cart", "blue"],
  personal_and_home_essentials: ["home", "navy"],
  leasure_and_entertainment: ["ticket", "sky"],
  auto_and_transport: ["car", "teal"],
  healthcare: ["health", "teal"],
  bills_and_utilities: ["bolt", "orange"],
  fees: ["bank", "orange"],
  taxes: ["bank", "orange"],
  loan_payment: ["bank", "orange"],
  loan_payments: ["bank", "orange"],
  transfer: ["arrow", "grey"],
  investment: ["trend", "teal"],
  income: ["down", "periwinkle"],
  refunds: ["down", "periwinkle"],
};
const ICONES_SC = { fuel: ["fuel", "teal"], dining_out: ["food", "blue"], fast_food: ["food", "blue"], clothing: ["bag", "navy"], personal_gifts: ["gift", "sky"] };
export function posteIcone(t) {
  return ICONES_SC[t.sous_categorie] || ICONES[t.categorie] || ["box", "grey"];
}
