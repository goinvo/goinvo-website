/**
 * Static name->bio mapping for the Author component.
 * Combines current team + alumni + external collaborators from the old Gatsby site.
 * Bios are auto-resolved by the Author component when no children are provided.
 */

export const teamBios: Record<string, string> = {
  // Current team
  'Juhan Sonin':
    "Juhan Sonin leads GoInvo with expertise in healthcare design and system engineering. He's spent time at Apple, the National Center for Supercomputing Applications (NCSA), and MITRE. His work has been recognized by the New York Times, BBC, and National Public Radio (NPR) and published in The Journal of Participatory Medicine and The Lancet. He currently lectures on design and engineering at MIT.",
  'Eric Benoit':
    "Eric Benoit is the Creative Director of GoInvo, leading the studio's UX creation process from concept to production. Eric works as an interaction designer, experience designer, and information architect, designing better products by thoroughly understanding user behaviors, expectations, and goals. Eric's background and love for design in the context of human experience helps him transform complex information systems in healthcare and the enterprise into responsive and adaptive human-centered designs.",
  'Jen Patel':
    'Jennifer is a designer-developer hybrid specializing in user interface design and front-end development. She creates beautiful designs using big and small data, often for health and enterprise services. Jennifer joined Invo in 2011 and is a graduate of the Rochester Institute of Technology.',
  'Claire Lin':
    'Claire is a designer-engineer combining architecture and product design in making healthcare digital services. She works on local, public projects on clothing recycling and neighborhood health through Design for America. Claire joined Invo in 2021 with a BA in Mechanical Engineering from Brown University.',
  'Chloe Ma':
    'Chloe is a designer and researcher specializing in medical and scientific storytelling. She drives to improve healthcare equity, education, and accessibility through good design. Chloe joined Invo in 2021 with a BS in BioChemistry and Molecular Biology from Dalhousie University and a MSc in Biomedical Communication from University of Toronto.',
  'Craig McGinley':
    'Craig is an engineer devoted to full stack design and development. He brings skillful javascripting, front-end development techniques, and application logic design to software projects. Craig joined Invo in 2014 as a Launch Academy graduate, vegan, and a musician.',
  'Tala Habbab':
    'Tala is a designer with a background in medical devices and product design. She creates services that improve healthcare access and understandability. Tala joined GoInvo in 2022 with a BS in Materials Science and Biomedical Engineering and a MS in Product & Service Design from Carnegie Mellon University.',
  'Shirley Xu':
    'Shirley is a designer-engineer with a background in art, engineering, and bioinformatics. She makes complex healthcare concepts and information actionable and beautiful. Shirley holds a BS in Computer Science from University of Massachusetts Amherst and an MS in Bioinformatics from Brandeis University.',
  'Maverick Chan':
    'Maverick is a designer with a background in architecture and public health. He works to make people\'s lives better by creating digital spaces and systems that support healthier living. Maverick joined GoInvo in 2024 with a BASc from McMaster University and an M.Arch from the University of British Columbia.',
  'Jonathan Follett':
    "As Principal of GoInvo, Jonathan is responsible for project management and design for select engagements. Jon has fifteen years of experience and has garnered several American Graphic Design Awards. Jon is an internationally published author on user experience and information design with over 25 articles published in UXmatters, Digital Web and A List Apart. His most recent book, Designing for Emerging Technologies, was published by O'Reilly Media.",

  // Alumni
  'Daniel Reeves':
    'Daniel is a designer and developer with a diverse background in building interactive and science-based exhibits to academic research in interdisciplinary physics. He has a PhD in physics and quantitative biology from Brandeis University and held subsequent positions at Harvard and MIT. Daniel joined the GoInvo team in 2018 to build engaging biologic and healthcare services.',
  'Samantha Wuu':
    'Sam is a writer, editor, and resident People Person at GoInvo. She previously worked at NYC Health + Hospitals on the migration of the provider credentialing process to a digital platform. A middle school English teacher in a past life, Sam is also a lifelong detail enthusiast and fan of diversity (of both people and punctuation). She joined Invo in 2022 with a BA in English from Barnard College and an MEd from Harvard University.',
  'Shayla Nettey':
    'Shayla Nettey is a physician with a taste for design. Her focus on community medicine and patient education pushes her public health goals where all patients better control their health with help from happier, skilled clinicians. Shayla joined Invo in 2021, is a graduate of Morehouse School of Medicine, and practices as a hospitalist in North Carolina.',
  'Amelia Luo':
    "Amelia joined GoInvo as a user experience design intern in 2024. Passionate about health, education, and entertainment, Amelia is currently completing a Master's at Carnegie Mellon University's Entertainment Technology Center and holds a BFA in Illustration from School of Visual Arts.",
  'Oliver Bello':
    'Oliver is a designer and engineer learning digital storytelling and product design. They joined GoInvo in 2024 and are finishing a BS in Engineering Psychology at Tufts University.',
  'Sue Park':
    'Sue Park joined GoInvo in 2024 with a background in industrial design and human-computer interaction. Her previous work includes designing intuitive interfaces for the healthcare and fintech industries. She holds a BS in Industrial Design from Korea Advanced Institute of Science & Technology and an MS in Information from the University of Michigan.',
  'Katerina Labrou':
    'Katerina is an engineer and designer with a background in computational architecture and augmented reality design. She merges technical expertise and creative vision to change the way we experience and interact with our surroundings and health. Kat joined GoInvo in 2024 with a BS in Architecture and a combined MS in Electrical Engineering and Computer Science from MIT.',
  'Malia Hong':
    "Malia is a designer with a background in industrial design and human-centered technology design. Her primary focus is healthcare and socially responsible design, effectively advocating for individuals confronting adversity. Additionally, she concentrates on incorporating gamification to enhance interaction engagement. She has a bachelor's degree in ID from the Rhode Island School of Design and is pursuing a master's degree in Design for Interactions at Carnegie Mellon University.",
  'Michelle Bourdon':
    'Michelle is a designer and developer with a background in computer science, business, and healthcare. She is currently working towards a BS in Computer Science at the University of Western Ontario (UWO). Michelle joined GoInvo as an intern in 2024.',
  'Mandy Liu':
    "Mandy is studying Graphic Design and Computation at Rhode Island School of Design. Mandy is designing the next generation of mobile clinics to be an augmented clinical decision support system. Mandy's combination of spatial design, software design, and illustration, is setting the stage for the future of healthcare.",
  'Jenny Yi':
    "Jenny is a designer of urban infrastructures that impact public health. She designs spaces that incorporate new healthcare technologies to create seamless experiences for people's access to healthcare services. She joined Invo in 2022 with a B.Arch from Cornell University and a M.Des from Harvard Graduate School of Design.",
  'Parsuree Vatanasirisuk':
    'Parsuree is a user experience designer and illustrator with background in industrial design. She makes the complex beautiful and approachable through illustration and information design. Parsuree joined Invo in 2018, and has a BA in Industrial Design from Chulalongkorn University and a MFA from Rochester Institute of Technology (RIT).',
  'Sharon Lee':
    'Sharon is a designer with an eclectic background in engineering, medicine, and art. Passionate about healthcare, she has focused her efforts on human-centered software design. She joined Invo in 2016 with a BS in Biomedical Engineering from the University of Virginia.',
  'Matthew Reyes':
    'Matthew is a designer and developer with a background in health diagnostics and patient care. Dedicated to improving public health systems and dismantling health inequities, he joined Invo in 2022 while completing his MPH at the University of California, Berkeley.',
  'Arpna Ghanshani':
    'Arpna is a designer with a background in data science and public health. She strives to create beautiful, data-driven primary self care services and improve access to healthcare. She joined Invo in 2022 while completing her BA in Data Science and BA in Public Health at the University of California, Berkeley.',
  'Ines Amri':
    "Ines is a designer and data analyst. She translates complex, often chaotic medical problems into elegant digital experiences. As an advocate for international women's health and human rights, Ines joined GoInvo in 2021 with a BA in Economics from Paris Dauphine University and an MSc in Digital Health and Data Analytics from the University of Reading.",
  'Huahua Zhu':
    'Huahua is a designer who tells stories through illustration, animation and comics. She creates beautiful narratives to show how our healthcare should be treating all of us. She joined Invo in 2022 with a BFA from Rhode Island School of Design.',
  'Megan Hirsch':
    "Megan is a designer-strategist that makes healthcare experiences enjoyable for patients and clinicians. She's dialing in her design and biology-trained eye to amplify her medical school experience in 2022. She joined Invo in 2021 with a BS in Human Biology from Stanford University.",
  'Vickie Hua':
    'Vickie is studying health & economics at The Wharton School of the University of Pennsylvania. She is jamming on the open source health picture and studying how illustrated faces help or hinder understanding health.',
  'Colleen Tang Poy':
    'Colleen is a designer at the intersection of art and science. Her mission is to make healthcare and health information more accessible through beautiful storytelling. Colleen joined Invo in 2019 and has a BS in Psychology and Neuroscience from McMaster University and a MS in Biomedical Communication at the University of Toronto.',
  'Elle Marcus':
    'Elle is an engineer with a design eye. With mechanical engineering genes in machine design and bio-procurement, she now focuses on human performance, system engineering, and healthcare design. Elle received a MechE degree from Case Western Reserve University in 2016 and is working on a Masters of Design Innovation from MassArt due in 2022. She works on global open source projects and designs while cooking.',
  'Meghana Karande':
    'Meghana is a classically trained clinician via Yale and Mount Sinai who fights for truth and against tricknology. With 15 years in pharma, insurance, and gov sectors, she takes a system approach to solving healthcare problems. She provides deep clinical insights and medical experience for studio projects. Before her clinical education, Meghana received a BS in Psychology from Cornell University.',
  'Hannah Sennik':
    "Hannah Sennik drives a rare trio of skills: bioengineering, systems design, and art. With a BASc of Systems Design Engineering from Waterloo, she joined Apple Computer to calibrate, instrument, and test hardware services. A MSE in BioEngineering Design from Johns Hopkins University pushes Hannah's goal of melting design, healthcare, and system engineering into her wetware.",
  'Patricia Nguyen':
    'Patricia Nguyen is a designer who works at the intersection of art and science to create beautiful and impactful healthcare software experiences. Born near Paris, she has lived in France and Canada. Patricia is a graduate of McMaster University with a BS in Kinesiology, and has a Masters in Biomedical Communications from the University of Toronto.',
  'Farah Hamade':
    "Farah Hamade is a biomedical designer. She has a neurobio BS from from UC Davis, and is working on a MSc in BioMed from University of Toronto. Farah's skill combination of physiology, behavior, and illustration drives her healthcare design eye.",
  'Edwin Choi':
    'Edwin is a biologist turned designer. Combining the sciences and art, he orchestrates healthcare software experiences to be beautiful and clinically refined. Edwin joined Invo in 2015, is a graduate of Washington University, and has a masters in biomedical design from Johns Hopkins University.',
  'Bryson Wong':
    'Bryson is a designer who spans the gamut of software strategy skills from user research to product design to usability. Bryson joined Invo in 2017 with a degree in Human Factors from Tufts University.',

  // External collaborators
  'Hrothgar':
    'Hrothgar is a designer and engineer. Trained as a mathematician, he combines elegance and rigor in software development and interface design. Hrothgar is a graduate of Rice University, and joined Invo in 2016 following doctoral studies at the University of Oxford.',
  'Kelsey Kittelsen':
    'Kelsey is a designer and engineer. She specializes in taking an analytical approach to problem solving while focusing on human needs. She is currently studying engineering with a concentration in human-centered design and product development at Dartmouth College.',
  'Cagri Zaman':
    'Dr. Cagri Hakan Zaman is the Director of Virtual Collaboration Research (Mediate Labs) as well as the founder and former director of the MIT Virtual Experience Design Lab at the Massachusetts Institute of Technology.',
  'Mollie Williams':
    'Mollie is a visionary and purposeful leader dedicated to advancing health equity and justice. Strategic thinker who gracefully transitions between big picture impact and day-to-day operations.',
}
