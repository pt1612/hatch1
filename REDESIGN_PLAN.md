\# Hatch — Continuazione redesign strutturale

\#\# Contesto

Sto facendo un refactor a tre livelli dell'app Hatch. Le prime tre sezioni del piano sono già state implementate da un altro tool (Codex). Tu (Cursor \+ Sonnet 4.6) prendi in mano le sezioni successive.

\*\*Prima di iniziare qualunque cosa\*\*: ispeziona il codice per capire lo stato attuale. In particolare:  
\- Verifica come è strutturata la navigazione (header, breadcrumb, livelli WtP/VPC/BMC)  
\- Verifica il modello dati di VPC (deve essere entità indipendente con tabella di join \`VPC\_Opportunity\`)  
\- Verifica il modello dati di BMC (deve avere tabella di join \`BMC\_VPC\` con campo \`role\` primary/secondary)  
\- Verifica le migrazioni esistenti in \`supabase/migrations/\`

Se trovi qualcosa che non corrisponde a quello descritto sotto come "già fatto", segnalamelo prima di procedere.

\---

\#\# Cosa è già stato fatto (NON rifare)

\#\#\# Sezione 3 — VPC come strumento indipendente  
\- Entità \`VPC\` indipendente con campi: customer profile, value proposition, jobs, pains, gains, products & services, pain relievers, gain creators.  
\- Tabella di join \`VPC\_Opportunity\` per relazione molti-a-molti VPC ↔ opportunità.  
\- Migrazione dei VPC esistenti.  
\- Pagina "Your VPCs" / "I tuoi VPC" accessibile dalla navigazione.  
\- Schermata di creazione VPC con campo customer profile name e multi-select delle opportunità collegate.  
\- Sezione "Linked VPCs" nella vista opportunità.

\#\#\# Sezione 5 — BMC e relazione con VPC  
\- Tabella di join \`BMC\_VPC\` con campi \`bmc\_id\`, \`vpc\_id\`, \`role\` ('primary' | 'secondary'), \`created\_at\`.  
\- Vincolo: ogni BMC ha esattamente un VPC con role='primary'.  
\- BMC eredita Customer Segments \+ Value Propositions dal VPC primario (pre-popolati read-only).  
\- Gli altri sette blocchi del BMC sono compilabili.  
\- Sezione "Secondary segments" nel BMC per aggiungere VPC secondari.  
\- Relazione con opportunità passa attraverso il VPC primario.

\#\#\# Sezione 1 — Ristrutturazione navigazione a tre livelli  
\- Header con navigazione a due livelli: Livello primario (Where to Play, VPC, BMC) \+ Livello secondario (i 5 sotto-step del WtP quando si è dentro Where to Play).  
\- VPC e BMC lockati con lucchetto finché Strategy non è completata almeno una volta.  
\- Tre stati visivi per ogni blocco del livello primario: lockato, in corso, completato.  
\- Logica di completamento: WtP completato quando c'è un'opportunità prioritaria selezionata nella Strategy; VPC/BMC completati quando esiste almeno un VPC/BMC salvato.

\---

\#\# Cosa devi fare tu (in ordine)

\#\#\# Sezione 2 — Schermata di completamento Where to Play

Dopo che l'utente ha fatto la prioritizzazione nella Strategy, \*\*sotto la stessa schermata Strategy\*\* (non in una pagina separata) compare un blocco di completamento. È un'estensione della pagina Strategy esistente che appare solo quando esiste un'opportunità marcata come prioritaria.

\*\*Layout del blocco:\*\*

1\. \*\*Banner di completamento\*\* (verde teal, in evidenza):  
   \- Icona di check  
   \- Label piccola maiuscola: "Level 1 — completed" (IT: "Livello 1 — completato")  
   \- Titolo: "Where to Play"  
   \- Bottone secondario "Review" / "Rivedi" che riporta agli step precedenti del WtP

2\. \*\*Tre metric card orizzontali dentro il banner verde:\*\*  
   \- "Skills mapped: N"  
   \- "Opportunities generated: M"  
   \- "Evaluated: X"

3\. \*\*Linea separatrice \+ opportunità prioritaria:\*\*  
   \- Label "Priority opportunity" / "Opportunità prioritaria"  
   \- Nome dell'opportunità \+ score (es. "Piattaforma di formazione per elettricisti junior · 8.4/10")

4\. \*\*Sezione "Deepen with" / "Approfondisci con" sotto il banner verde:\*\*  
   \- Due card affiancate (grid 1fr 1fr):  
     \- \*\*Card VPC\*\*: icona, label "Level 2", titolo "Value Proposition Canvas", descrizione breve ("Deepen an opportunity by understanding the customer"), bottone "Start a VPC"  
     \- \*\*Card BMC\*\*: icona, label "Level 3", titolo "Business Model Canvas", descrizione breve ("Build the business model on the priority VP"), bottone "Start a BMC"

5\. \*\*Info box in fondo:\*\*  
   \- Testo: "VPC and BMC are optional. You can also stop your Where to Play here."

\*\*Comportamento:\*\*  
\- Il blocco non compare se la Strategy non è stata completata.  
\- Quando l'utente ha già fatto VPC o BMC, le card "Start a VPC/BMC" si trasformano in una sezione "Your deepenings" / "I tuoi approfondimenti" che lista quelli esistenti, con un bottone "Add another" in fondo.

\*\*Stile:\*\*  
\- Palette verde teal per il banner di completamento.  
\- Metric card dentro il banner: sfondo bianco semitrasparente.  
\- Card VPC e BMC sotto: neutre, visivamente subordinate al banner verde.

\---

\#\#\# Sezione 4 — Tre modalità di compilazione del VPC

Quando l'utente crea un nuovo VPC, deve poter scegliere tra tre modalità di popolamento del customer profile:

1\. \*\*Compilazione manuale\*\*: l'utente scrive direttamente i post-it nei tre ambiti (jobs, pains, gains) tramite form.

2\. \*\*Intervista reale caricata\*\*: l'utente carica una sbobinatura di intervista (file txt, pdf, o testo incollato). L'IA estrae automaticamente i post-it dai tre ambiti e li mostra all'utente, che può modificarli prima di salvare.

3\. \*\*Virtual interview con twin\*\*:  
   \- L'utente descrive brevemente il segmento target.  
   \- L'IA genera un "twin" (persona simulata) coerente con quel segmento.  
   \- L'utente chatta con il twin facendogli domande tipo intervista.  
   \- Al termine, l'IA estrae i post-it dalla conversazione.

\*\*UI:\*\*

Schermata di scelta modalità: tre card visivamente distinte, ognuna con icona, titolo, descrizione breve, bottone "Choose this method".

Una volta scelta la modalità, la schermata successiva è diversa per ognuna:  
\- Manuale → form classico con i tre ambiti  
\- Intervista reale → area di upload/incolla \+ preview dei post-it estratti  
\- Virtual interview → schermata di chat con il twin

In tutte e tre le modalità, l'utente arriva infine alla stessa schermata di \*\*revisione del customer profile\*\* dove può modificare i post-it estratti prima di salvare.

\*\*Note implementative:\*\*  
\- Per la virtual interview, salva la trascrizione della conversazione con il twin nel database.  
\- Per l'intervista reale, salva il file/testo originale come allegato al VPC.  
\- L'estrazione automatica usa il modello AI già configurato per le altre operazioni nell'app.

\---

\#\#\# Sezione 6 — Quattro punti di ingresso

Oggi l'utente può iniziare solo dal Where to Play (Skills). Va aggiunta la possibilità di entrare anche da:

\- \*\*"Ho un'idea"\*\* / "I have an idea" — parte direttamente dallo step Opportunities (saltando Skills). L'utente inserisce manualmente una o più opportunità.  
\- \*\*"Ho il VPC"\*\* / "I have a VPC" — parte direttamente dalla creazione di un VPC. All'apertura chiede nome del customer profile \+ nome e segmento dell'opportunità (che viene creata automaticamente come opportunità "leggera" senza valutazione).  
\- \*\*"Ho il BMC"\*\* / "I have a BMC" — parte direttamente dalla creazione di un BMC, ma serve almeno un VPC come primario, quindi guida l'utente a creare prima un VPC.

\*\*UI:\*\*

Schermata iniziale del progetto: quando l'utente crea un nuovo progetto, prima di vedere la lista degli step, vede una pagina di scelta con quattro card:

1\. "Complete path" / "Percorso completo" — parti dalle abilità  
2\. "I have an idea" / "Ho un'idea" — parti dall'opportunità  
3\. "I have a VPC" / "Ho il VPC" — parti dal customer profile  
4\. "I have a BMC" / "Ho il BMC" — parti dal modello di business

Ogni card ha titolo, descrizione breve di una riga, icona.

Dopo la scelta, l'utente entra direttamente nello step corrispondente, ma gli step precedenti restano accessibili (non bloccati) tramite la navigazione. Sono solo non popolati.

\*\*Note implementative:\*\*  
\- La scelta del punto di ingresso non vincola il resto del flusso: l'utente può sempre tornare indietro a popolare gli step precedenti se vuole.  
\- Salva la scelta iniziale come metadato del progetto.  
\- Per "Ho il VPC": le tre modalità di compilazione (Sezione 4\) sono comunque disponibili.

\---

\#\#\# Sezione 7 — Coerenza navigazione e persistenza

\- \*\*Dashboard del progetto\*\*: la vista iniziale di un progetto già aperto deve mostrare lo stato dei tre livelli (WtP, VPC, BMC) con i loro stati di completamento, non più la lista step.  
\- \*\*Breadcrumb\*\*: quando l'utente è in uno step interno del WtP, il breadcrumb mostra "Where to Play › Strategy" invece di solo "Strategy".  
\- \*\*Persistenza dello stato\*\*: se l'utente lascia il progetto e torna, deve trovarsi nello step in cui era. La navigazione tra livelli e step deve essere libera in entrambe le direzioni.

\---

\#\# Migrazioni database

Se una sezione richiede modifiche allo schema del database, genera i file di migrazione nella cartella \`supabase/migrations/\` con nome leggibile e commento esplicativo in cima. Non applicare le migrazioni al database remoto, lo farò io con \`supabase db push\`. Dimmi chiaramente quando una sezione produce nuove migrazioni così so che devo lanciare il comando prima di testare.

\#\# Ordine di esecuzione

1\. Sezione 2 (schermata di completamento WtP)  
2\. Sezione 4 (tre modalità VPC)  
3\. Sezione 6 (quattro punti di ingresso)  
4\. Sezione 7 (coerenza navigazione)

Se incontri qualcosa di ambiguo o che cambia significativamente la struttura del progetto, fermati e chiedimi prima di procedere.  
