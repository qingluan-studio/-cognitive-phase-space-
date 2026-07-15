# -*- coding: utf-8 -*-
"""
Prompt Library Module
=====================
Provides a comprehensive collection of prompts organized by category.
Supports retrieval by category and random sampling.

Categories:
    coding, math, creative_writing, factual_qa, reasoning, translation,
    summarization, analysis, debate, poetry, storytelling, tech_doc,
    email, product_desc, news, history, science, philosophy, economics, law
"""

import random
import json
from typing import List, Dict, Any, Optional

# =============================================================================
# Prompt Templates and Raw Data
# =============================================================================

# Base prompt template dictionary structure:
# { "id": str, "category": str, "difficulty": float(0-1), "type": str, "prompt_text": str }

_CODING_TEMPLATES = [
    "Write a Python function to {task}.",
    "Implement {task} in JavaScript.",
    "Debug the following {language} code that {task}.",
    "Create a {language} class for {task}.",
    "Refactor this code to {task}.",
    "Write unit tests for {task}.",
    "Optimize an algorithm that {task}.",
    "Build a REST API endpoint to {task}.",
    "Design a database schema for {task}.",
    "Write a shell script to {task}.",
    "Implement {task} using recursion.",
    "Convert this pseudocode to {language}.",
    "Explain how to {task} in {language}.",
    "Create a regex pattern to {task}.",
    "Set up a CI/CD pipeline to {task}.",
    "Write a Docker configuration to {task}.",
    "Implement authentication for {task}.",
    "Create a data structure to {task}.",
    "Write a SQL query to {task}.",
    "Build a frontend component that {task}.",
]

_CODING_TASKS = [
    "sort a list of integers", "find the maximum subarray sum", "reverse a linked list",
    "implement binary search", "validate a Sudoku board", "clone a graph",
    "merge two sorted arrays", "detect a cycle in a linked list", "find the longest common prefix",
    "group anagrams together", "find missing numbers in a range", "implement a LRU cache",
    "solve the knapsack problem", "find the diameter of a binary tree", "serialize a binary tree",
    "evaluate Reverse Polish Notation", "find all permutations of a string", "calculate edit distance",
    "implement a trie data structure", "solve the N-Queens problem", "find the median of two arrays",
    "implement quicksort", "build a min-heap from an array", "find bridges in a graph",
    "implement topological sort", "solve the traveling salesman problem", "find strongly connected components",
    "implement A* pathfinding", "build a recommendation engine", "implement map-reduce for word count",
    "create a real-time chat server", "build a URL shortener service", "implement rate limiting",
    "create a job scheduler", "build a payment gateway integration", "implement OAuth2 login",
    "create an image thumbnail generator", "build a notification system", "implement full-text search",
    "create a data pipeline", "build a monitoring dashboard", "implement feature flags",
    "create a plugin architecture", "build a message queue consumer", "implement circuit breaker pattern",
    "create a distributed lock", "build a caching layer", "implement event sourcing",
    "create a webhook handler", "build a CSV parser with validation", "implement a Bloom filter",
    "create a load balancer simulator", "build a token bucket algorithm", "implement consensus protocol",
]

_MATH_TEMPLATES = [
    "Solve the equation: {problem}",
    "Prove that {problem}",
    "Calculate the value of {problem}",
    "Find the derivative of {problem}",
    "Evaluate the integral of {problem}",
    "Determine the limit of {problem}",
    "Simplify the expression: {problem}",
    "Find the roots of {problem}",
    "Apply the quadratic formula to {problem}",
    "Solve the system: {problem}",
    "Find the eigenvalues of {problem}",
    "Calculate the determinant of {problem}",
    "Prove by induction that {problem}",
    "Find the Taylor series for {problem}",
    "Solve the differential equation: {problem}",
    "Optimize the function {problem}",
    "Find the Fourier transform of {problem}",
    "Calculate the probability of {problem}",
    "Apply Bayes' theorem to {problem}",
    "Find the expected value of {problem}",
]

_MATH_PROBLEMS = [
    "x^2 + 3x + 2 = 0", "sin(x) + cos(x) = 1", "the sum of first n natural numbers",
    "the area under y = x^2 from 0 to 1", "lim(x->0) sin(x)/x", "the gradient of f(x,y) = x^2 + y^2",
    "the matrix [[1,2],[3,4]]", "the volume of a sphere with radius r", "P(A|B) given P(A)=0.5, P(B)=0.3",
    "the prime factorization of 360", "gcd(48, 18)", "the binomial expansion of (x+y)^5",
    "the convergence of sum(1/n^2)", "the Laplace transform of e^(-at)", "the solution to dy/dx = y",
    "the maximum of f(x) = -x^2 + 4x - 3", "the convolution of two rectangular pulses",
    "the variance of a uniform distribution on [0,1]", "the covariance matrix of random vector X",
    "the solution to the heat equation u_t = u_xx", "the shortest path in a weighted graph",
    "the chromatic number of a complete graph K5", "the Euler characteristic of a torus",
    "the Riemann sum for x^2 on [0,2]", "the residue of f(z) at z=0", "the genus of a curve x^3 + y^3 = 1",
    "the condition number of a matrix", "the kernel of a linear transformation T(x)=Ax",
    "the homology group H_1(S^1)", "the cardinality of the power set of N", "the golden ratio phi",
    "the Mandelbrot set iteration z_{n+1} = z_n^2 + c", "the Julia set for c = -0.8 + 0.156i",
    "the Hausdorff dimension of the Cantor set", "the fixed point of cos(x)",
    "the Ramsey number R(3,3)", "the winding number of a curve around origin",
    "the index of a vector field singularity", "the Gauss curvature of a sphere",
    "the geodesic on a surface of revolution", "the Pontryagin dual of Z", "the p-adic valuation of 48",
    "the class number of Q(sqrt(-5))", "the zeta function at s=2", "the Mertens function M(100)",
    "the order of the group S_5", "the Sylow 2-subgroups of S_4", "the Brauer group of a finite field",
    "the Hochschild cohomology HH^*(A)", "the Ext group Ext^1_Z(Z/2Z, Z)",
]

_CREATIVE_WRITING_TEMPLATES = [
    "Write a short story about {topic}.",
    "Describe a world where {topic}.",
    "Create a character who {topic}.",
    "Write a dialogue between {topic}.",
    "Imagine a scene in which {topic}.",
    "Write a flash fiction piece on {topic}.",
    "Craft a narrative arc for {topic}.",
    "Develop a setting where {topic}.",
    "Write an opening paragraph for {topic}.",
    "Create a plot twist involving {topic}.",
    "Write from the perspective of {topic}.",
    "Describe the emotional journey of {topic}.",
    "Write a story that begins with {topic}.",
    "Create a fictional diary entry about {topic}.",
    "Write a mystery centered on {topic}.",
    "Craft a romance subplot involving {topic}.",
    "Write a science fiction scenario about {topic}.",
    "Create a fantasy realm ruled by {topic}.",
    "Write a horror story featuring {topic}.",
    "Develop a coming-of-age tale about {topic}.",
]

_CREATIVE_WRITING_TOPICS = [
    "a sentient library", "the last lighthouse keeper", "a city built on clouds",
    "a time-traveling barista", "a forgotten god in a subway station", "a painter who brings art to life",
    "a musician who can hear colors", "a post-apocalyptic circus", "a dragon who is afraid of fire",
    "a ghost who forgets they are dead", "a postman in a world of telepathy", "a chef who cooks memories",
    "a detective who can taste lies", "a garden that grows only at midnight", "a robot who wants to dream",
    "a mirror that shows possible futures", "a librarian who speaks with books", "a ship that sails on starlight",
    "a kingdom where emotions are currency", "a child who collects whispers", "a train that stops at nonexistent stations",
    "a weaver who creates destinies", "a clockmaker who repairs broken time", "a photographer who steals souls",
    "a baker whose bread grants wishes", "a tailor who sews invisible cloaks", "a cartographer mapping imaginary lands",
    "a pirate hunting for sunken constellations", "a knight protecting a village of monsters", "a witch who uses science instead of magic",
    "a skyscraper that grows like a tree", "a marketplace where dreams are traded", "a forest where trees remember everything",
    "a submarine exploring oceans of sand", "a blacksmith forging weapons from starlight", "a dancer who can stop time with a pirouette",
    "a scholar translating the language of birds", "a healer who absorbs others' pain", "a thief who steals shadows",
    "a bridge connecting parallel universes", "a festival celebrating the end of eternity", "a cemetery where the dead tell stories",
    "a theater where actors become their roles forever", "a musician whose violin weeps real tears", "a puppet who cuts his own strings",
    "a city that rearranges itself every night", "a river flowing backward through history", "a door that only opens for the lost",
    "a tower reaching into someone else's dream", "a snow globe containing an entire civilization", "a love letter never meant to be sent",
]

_FACTUAL_QA_TEMPLATES = [
    "What is {topic}?",
    "Explain {topic} in simple terms.",
    "Who invented {topic}?",
    "When did {topic} happen?",
    "Where is {topic} located?",
    "Why is {topic} important?",
    "How does {topic} work?",
    "List the main components of {topic}.",
    "Describe the history of {topic}.",
    "What are the types of {topic}?",
    "Compare {topic} with its alternatives.",
    "What are the benefits of {topic}?",
    "What are the drawbacks of {topic}?",
    "How is {topic} measured?",
    "What is the origin of {topic}?",
    "Who are the key figures in {topic}?",
    "What is the current state of {topic}?",
    "How has {topic} evolved over time?",
    "What are common misconceptions about {topic}?",
    "Provide a timeline for {topic}.",
]

_FACTUAL_QA_TOPICS = [
    "photosynthesis", "the Internet", "the Great Wall of China", "black holes", "the Roman Empire",
    "quantum mechanics", "the immune system", "blockchain technology", "the Renaissance", "nuclear fusion",
    "DNA replication", "artificial neural networks", "the Silk Road", "volcanic eruptions", "the ozone layer",
    "machine learning", "the French Revolution", "antibiotic resistance", "solar panels", "the Big Bang",
    "CRISPR gene editing", "cloud computing", "the Industrial Revolution", "tectonic plates", "vaccination",
    "5G networks", "the Hubble Space Telescope", "carbon dating", "electric vehicles", "the periodic table",
    "mitochondria", "the Turing test", "the Magna Carta", "coral bleaching", "dark matter",
    "natural language processing", "the Cold War", "photosynthetic efficiency", "graphene", "the Standard Model",
    "epigenetics", "augmented reality", "the Byzantine Empire", "aurora borealis", "neutrinos",
    "reinforcement learning", "the Marshall Plan", "ocean acidification", "superconductors", "the human genome project",
]

_REASONING_TEMPLATES = [
    "If {premise}, what can we conclude?",
    "Given that {premise}, is it true that {conclusion}?",
    "Analyze the logical structure of: {premise}",
    "What assumptions underlie the claim that {premise}?",
    "Evaluate the validity of this argument: {premise}",
    "Identify the fallacy in: {premise}",
    "Construct a syllogism about {topic}.",
    "What would be the counterargument to {premise}?",
    "If A implies B and B implies C, does A imply C? Explain using {topic}.",
    "Distinguish between necessary and sufficient conditions for {topic}.",
    "Apply modus ponens to {premise}.",
    "What is the weakest link in this chain of reasoning: {premise}?",
    "Reformulate {premise} as a deductive argument.",
    "Is the following an example of inductive or deductive reasoning: {premise}?",
    "What evidence would falsify the claim that {premise}?",
    "Construct a thought experiment about {topic}.",
    "If we assume {premise}, what paradox arises?",
    "Compare analogical reasoning about {topic_a} and {topic_b}.",
    "What cognitive biases might affect reasoning about {topic}?",
    "Explain abductive reasoning using {topic} as an example.",
]

_REASONING_PREMISES = [
    "all birds can fly and penguins are birds", "the sun rises every morning", "correlation implies causation",
    "if it rains the ground gets wet and the ground is wet", "every event has a cause", "knowledge requires certainty",
    "if a theory predicts observations and those observations occur, the theory is true", "machines cannot think because they lack consciousness",
    "moral values are relative to cultures", "free will exists because we feel we have choices", "if a set contains all sets that do not contain themselves",
    "the universe must have a designer because it is complex", "if actions are determined by prior causes, no one is morally responsible",
    "if something can be conceived as not existing, it is not necessary", "if I think therefore I am",
    "the whole is greater than the sum of its parts", "if time is infinite, every possibility will occur",
    "if simulation hypothesis is true, we are likely in a simulation", "if utilitarianism is correct, we should maximize happiness",
    "if the many-worlds interpretation is true, all possibilities are real", "if P=NP, cryptography as we know it fails",
    "if a tree falls in a forest and no one hears it, it makes no sound", "if identity persists through change, Ship of Theseus remains the same ship",
    "if determinism is true, moral praise and blame are incoherent", "if infinity exists, Hilbert's hotel can accommodate more guests",
    "if we cannot know anything for certain, skepticism is self-defeating", "if AI passes the Turing test, it understands language",
    "if backward causation is possible, grandfather paradox is resolvable", "if possible worlds are real, modal statements have truthmakers",
    "if the law of excluded middle holds, every proposition is either true or false", "if vagueness is ontological, there are no sharp boundaries",
    "if moral realism is true, moral facts are like scientific facts", "if semantic externalism is true, Twin Earth has different meanings",
    "if qualia are irreducible, physicalism is false", "if the block universe is correct, the future is as real as the past",
    "if epistemic closure fails, we cannot know we are not brains in vats", "if Bayesian reasoning is normative, priors should be updated",
    "if Occam's razor is valid, simpler theories are more likely true", "if the liar sentence is meaningful, classical logic is incomplete",
    "if compositionalism holds, the mind is composed of smaller mental parts", "if moral luck exists, outcomes affect moral assessment",
    "if practical reasons are not truth-apt, expressivism is correct", "if phenomenal concepts are perspectival, physicalism can be saved",
    "if time travel is possible, causal loops are permissible", "if emergence is strong, downward causation is real",
    "if the principle of sufficient reason holds, everything has an explanation", "if contextualism is true, knowledge attributions vary by context",
    "if structural realism is correct, we only know relations not objects", "if the fine-tuning argument succeeds, design is the best explanation",
    "if implicit bias exists without awareness, self-knowledge is limited", "if decision theory is normative, we should maximize expected utility",
]

_TRANSLATION_TEMPLATES = [
    "Translate the following into {target_lang}: {text}",
    "Provide a literal translation of: {text} ({source_lang} -> {target_lang})",
    "Translate and adapt this idiom: {text}",
    "Render this poem in {target_lang}: {text}",
    "Translate this technical sentence: {text}",
    "Convert this legal text to {target_lang}: {text}",
    "Translate this dialogue maintaining tone: {text}",
    "Provide back-translation for: {text}",
    "Translate this medical term: {text}",
    "How would you say '{text}' in {target_lang}?",
    "Translate this headline: {text}",
    "Render this children's rhyme in {target_lang}: {text}",
    "Translate this business email opening: {text}",
    "Convert this culinary term: {text}",
    "Translate this scientific abstract: {text}",
    "Adapt this marketing slogan for {target_lang} speakers: {text}",
    "Translate this historical document excerpt: {text}",
    "Render this song lyric in {target_lang}: {text}",
    "Translate this software error message: {text}",
    "Provide a colloquial translation of: {text}",
]

_TRANSLATION_TEXTS = [
    "The quick brown fox jumps over the lazy dog.",
    "To be or not to be, that is the question.",
    "Cogito, ergo sum.",
    "All roads lead to Rome.",
    "A friend in need is a friend indeed.",
    "The pen is mightier than the sword.",
    "Every cloud has a silver lining.",
    "When in Rome, do as the Romans do.",
    "The early bird catches the worm.",
    "Actions speak louder than words.",
    "Don't count your chickens before they hatch.",
    "The whole is greater than the sum of its parts.",
    "Necessity is the mother of invention.",
    "A rolling stone gathers no moss.",
    "Beauty is in the eye of the beholder.",
    "You can't have your cake and eat it too.",
    "The grass is always greener on the other side.",
    "Better late than never.",
    "Two heads are better than one.",
    "Where there's a will, there's a way.",
    "Rome wasn't built in a day.",
    "Time heals all wounds.",
    "Knowledge is power.",
    "Honesty is the best policy.",
    "Practice makes perfect.",
    "The customer is always right.",
    "Blood is thicker than water.",
    "Don't put all your eggs in one basket.",
    "A picture is worth a thousand words.",
    "Curiosity killed the cat.",
    "Fortune favors the bold.",
    "The squeaky wheel gets the grease.",
    "You can't teach an old dog new tricks.",
    "Birds of a feather flock together.",
    "There's no place like home.",
    "Absence makes the heart grow fonder.",
    "Don't judge a book by its cover.",
    "Good things come to those who wait.",
    "If it ain't broke, don't fix it.",
    "Laughter is the best medicine.",
    "Money doesn't grow on trees.",
    "No man is an island.",
    "Once bitten, twice shy.",
    "People who live in glass houses shouldn't throw stones.",
    "The best things in life are free.",
    "There's no such thing as a free lunch.",
    "Variety is the spice of life.",
    "When the going gets tough, the tough get going.",
    "You can lead a horse to water, but you can't make it drink.",
    "A journey of a thousand miles begins with a single step.",
]

_SUMMARIZATION_TEMPLATES = [
    "Summarize the following article: {text}",
    "Provide a one-sentence summary of: {text}",
    "Extract the main points from: {text}",
    "Write an abstract for: {text}",
    "Condense this report into bullet points: {text}",
    "Create an executive summary for: {text}",
    "Summarize this research paper: {text}",
    "What are the key takeaways from: {text}?",
    "Provide a tl;dr for: {text}",
    "Summarize this news story: {text}",
    "Reduce this paragraph to its essence: {text}",
    "Write a headline that captures: {text}",
    "Summarize the arguments in: {text}",
    "Provide a chapter summary for: {text}",
    "What is the conclusion of: {text}?",
    "Summarize this meeting transcript: {text}",
    "Extract action items from: {text}",
    "Summarize this product review: {text}",
    "Provide a synopsis of: {text}",
    "Summarize this legal document: {text}",
]

_SUMMARIZATION_TEXTS = [
    "Researchers have discovered a new species of deep-sea coral that thrives in extreme acidity.",
    "The stock market experienced a sharp decline following unexpected inflation data release.",
    "A new study suggests that regular exercise can reduce the risk of Alzheimer's disease by 30 percent.",
    "The city council approved a new zoning law that will affect downtown development for the next decade.",
    "Scientists have developed a novel battery technology using sodium ions that could replace lithium.",
    "The European Union announced new regulations on artificial intelligence aimed at ensuring transparency.",
    "Archaeologists unearthed an ancient temple complex dating back to 3000 BCE in modern-day Turkey.",
    "A recent meta-analysis found mixed results on the effectiveness of mindfulness meditation for anxiety.",
    "The automotive industry is shifting toward electric vehicles faster than originally projected.",
    "Climate models predict a two-degree Celsius rise in global temperatures by 2050 if emissions continue.",
    "The World Health Organization declared the recent outbreak contained after six months of intervention.",
    "Quantum computing researchers achieved a new milestone in error correction with 99.9 percent fidelity.",
    "The education ministry launched a nationwide program to improve digital literacy in rural schools.",
    "Astronomers detected a repeating fast radio burst from a galaxy 500 million light-years away.",
    "The central bank raised interest rates by 25 basis points to combat persistent inflation pressures.",
    "Marine biologists documented a recovery in whale populations following decades of conservation efforts.",
    "A cybersecurity firm reported a 40 percent increase in ransomware attacks targeting healthcare systems.",
    "The Supreme Court ruled in favor of environmental groups in a landmark clean water case.",
    "Neuroscientists mapped a previously unknown neural pathway involved in spatial memory formation.",
    "The film industry saw record box office returns this summer, surpassing pre-pandemic levels.",
    "Geneticists identified a gene variant associated with resistance to a common infectious disease.",
    "Urban planners proposed a pedestrian-only zone in the historic district to reduce traffic congestion.",
    "Astronauts aboard the space station completed a series of experiments on plant growth in microgravity.",
    "Economists warn that supply chain disruptions may persist through the next fiscal quarter.",
    "The museum unveiled a newly restored Renaissance painting that had been in storage for fifty years.",
    "Software engineers released an open-source tool that automatically detects bias in training datasets.",
    "Public health officials urge vaccination ahead of a predicted severe flu season.",
    "The robotics team demonstrated a humanoid robot capable of navigating uneven terrain autonomously.",
    "Linguists documented a previously unknown sign language used by a remote community.",
    "The agriculture department approved drought-resistant crop varieties for commercial farming.",
    "Energy analysts project that renewables will account for half of global electricity by 2030.",
    "The defense ministry outlined a new strategy focusing on cyber warfare and satellite security.",
    "Paleontologists found fossilized footprints suggesting coordinated group behavior in early dinosaurs.",
    "A consumer advocacy group published a report on hidden fees in digital subscription services.",
    "Material scientists created a self-healing polymer that repairs cracks when exposed to sunlight.",
    "The transportation authority announced delays on the subway due to signal modernization work.",
    "Sociologists studied the impact of remote work on urban migration patterns post-pandemic.",
    "The pharmaceutical company received FDA approval for a new monoclonal antibody treatment.",
    "Wildlife conservationists celebrated the birth of an endangered species at a breeding center.",
    "The telecom regulator auctioned spectrum bands to expand 5G coverage nationwide.",
    "Historians re-examined archival letters revealing new insights into diplomatic negotiations of 1919.",
    "Machine learning models now outperform human experts in detecting certain eye diseases from scans.",
    "The tourism board launched a campaign to promote sustainable travel in coastal regions.",
    "Engineers tested a prototype supersonic aircraft designed to minimize sonic boom noise.",
    "The judiciary committee held hearings on proposed reforms to intellectual property law.",
    "Botanists discovered a carnivorous plant species with a unique trapping mechanism.",
    "The charity organization distributed emergency supplies to areas affected by severe flooding.",
    "Physicists observed a new quasiparticle behaving like a magnetic monopole in a solid.",
    "The local government banned single-use plastics in all municipal facilities starting next year.",
    "Meteorologists tracked an unusually large storm system forming over the Pacific Ocean.",
]

_ANALYSIS_TEMPLATES = [
    "Analyze the strengths and weaknesses of {topic}.",
    "Perform a SWOT analysis on {topic}.",
    "What are the root causes of {topic}?",
    "Examine the trends in {topic} over the past decade.",
    "Compare and contrast {topic_a} and {topic_b}.",
    "Evaluate the impact of {topic} on society.",
    "Break down the components of {topic}.",
    "Assess the risks associated with {topic}.",
    "What metrics should be used to measure {topic}?",
    "Analyze the cost-benefit of {topic}.",
    "Identify the stakeholders in {topic}.",
    "What are the unintended consequences of {topic}?",
    "Analyze the supply chain of {topic}.",
    "Evaluate the competitive landscape of {topic}.",
    "What data would you need to analyze {topic}?",
    "Perform a sentiment analysis on {topic}.",
    "Analyze the correlation between {topic_a} and {topic_b}.",
    "What are the ethical implications of {topic}?",
    "Examine the lifecycle of {topic}.",
    "Analyze the scalability of {topic}.",
]

_ANALYSIS_TOPICS = [
    "remote work adoption", "electric vehicle market", "social media algorithms", "cryptocurrency volatility",
    "healthcare privatization", "online education platforms", "fast fashion industry", "cloud infrastructure providers",
    "artificial intelligence regulation", "global shipping logistics", "plant-based food sector", "streaming service competition",
    "microchip supply shortages", "renewable energy subsidies", "urban gentrification patterns", "cyber insurance market",
    "telemedicine growth", "space tourism feasibility", "biometric privacy concerns", "autonomous vehicle deployment",
    "carbon offset programs", "short-form video content", "freelance labor economy", "precision agriculture",
    "synthetic biology startups", "quantum computing readiness", "mental health apps", "digital currency adoption",
    "green hydrogen production", "personalized medicine", "3D printing in construction", "edge computing architecture",
    "vertical farming economics", "neurotechnology interfaces", "decentralized finance protocols", "e-sports viewership",
    "smart city infrastructure", "wearable health monitors", "nuclear small modular reactors", "cultured meat scaling",
    "drone delivery networks", "blockchain identity systems", "language model hallucinations", "data center cooling",
    "hypersonic travel investment", "ocean plastic removal", "satellite internet constellations", "crispr therapeutic pipeline",
    "virtual real estate markets", "carbon capture technology", "humanoid robotics labor", "privacy-preserving computation",
]

_DEBATE_TEMPLATES = [
    "Argue for and against: {topic}.",
    "Present the pro side of {topic}.",
    "Present the con side of {topic}.",
    "What are the strongest arguments for {topic}?",
    "What are the strongest arguments against {topic}?",
    "Rebut the claim that {topic}.",
    "Cross-examine the position that {topic}.",
    "Construct a case for {topic} based on evidence.",
    "Deconstruct the opposition to {topic}.",
    "Balance the ethical concerns of {topic}.",
    "Should {topic}? Provide a structured debate.",
    "Compare utilitarian and deontological views on {topic}.",
    "What would a libertarian say about {topic}?",
    "What would a socialist say about {topic}?",
    "Analyze the rhetoric used in debates about {topic}.",
    "Identify logical fallacies in arguments about {topic}.",
    "Frame {topic} as a false dichotomy and offer alternatives.",
    "Assess the burden of proof regarding {topic}.",
    "What empirical evidence is relevant to {topic}?",
    "How do cultural values shape opinions on {topic}?",
]

_DEBATE_TOPICS = [
    "universal basic income", "mandatory vaccination", "capital punishment", "censorship of hate speech",
    "genetic engineering of humans", "animal testing for cosmetics", "nuclear energy expansion", "affirmative action in admissions",
    "gun control legislation", "privacy vs national security", "autonomous weapons systems", "mandatory military service",
    "legalization of all drugs", "banning facial recognition in public", "single-payer healthcare", "school voucher programs",
    "four-day work week mandate", "open borders policy", "banning fossil fuel advertising", "compulsory voting",
    "Internet access as a human right", "banning encryption backdoors", "mandatory parental leave for both parents",
    "taxing sugar-sweetened beverages", "public funding for space exploration", "banning targeted advertising to minors",
    "lowering the voting age to 16", "mandatory retirement savings accounts", "publicly owned social media platforms",
    "banning private prisons", "mandatory climate education in schools", "limiting CEO pay ratios",
    "recognizing AI as legal persons", "banning non-compete agreements", "mandatory data portability",
    "outlawing stock buybacks", "public ownership of water resources", "mandatory jury duty reform",
    "banning deepfakes entirely", "legalizing human organ sales", "mandatory digital literacy training",
    "abolishing intellectual property", "public funding for journalism", "banning predictive policing",
    "mandating open-source government software", "criminalizing ecocide", "restricting private space mining",
    "mandating algorithmic transparency", "banning autonomous vehicles from cities", "outlawing factory farming",
    "implementing a wealth tax", "banning children from social media", "mandatory civil service for youth",
]

_POETRY_TEMPLATES = [
    "Write a sonnet about {topic}.",
    "Compose a haiku capturing {topic}.",
    "Create a free verse poem on {topic}.",
    "Write a limerick about {topic}.",
    "Draft a villanelle exploring {topic}.",
    "Compose an ode to {topic}.",
    "Write a sestina with keywords related to {topic}.",
    "Create a blackout poem from a passage about {topic}.",
    "Write an acrostic poem spelling {topic}.",
    "Compose a ballad telling the story of {topic}.",
    "Write a ghazal about {topic}.",
    "Create a concrete poem shaped like {topic}.",
    "Write an elegy for {topic}.",
    "Compose a pastoral poem set in {topic}.",
    "Write a pantoum about {topic}.",
    "Create a tanka describing {topic}.",
    "Write a slam poem on {topic}.",
    "Compose a rap verse about {topic}.",
    "Write a found poem using words about {topic}.",
    "Create an epigram summarizing {topic}.",
]

_POETRY_TOPICS = [
    "autumn rain", "lost love", "the ocean at midnight", "a rusted bicycle", "the first snowfall",
    "an abandoned lighthouse", "coffee steam in morning light", "the silence between notes", "a wilting sunflower",
    "footprints in wet sand", "the hum of electricity", "a clock stopped at 3 AM", "moths circling a lamp",
    "the smell of old books", "frost on a windowpane", "a train whistle in the distance", "dust motes in sunlight",
    "a cracked violin", "the color of forgetting", "breadcrumbs on a forest path", "the weight of unsent letters",
    "shadows lengthening at dusk", "a spider rebuilding its web", "the taste of salt on skin", "an echo in an empty hall",
    "the last leaf on a branch", "bubbles rising in dark water", "a moth-eaten tapestry", "the space inside a pause",
    "lichen growing on stone", "a melting candle", "the rhythm of knitting needles", "a door that never opens",
    "the geometry of snowflakes", "a reflection in a spoon", "the sound of tearing paper", "an unused ticket",
    "the color indigo at twilight", "a nest fallen from a tree", "the stillness before thunder",
    "a typewriter with a stuck key", "the smell of rain on concrete", "a streetlamp flickering to life",
    "the bend of a river", "a half-remembered dream", "the texture of velvet", "a seashell held to the ear",
    "the moment before a diver jumps", "a scar on a wooden table", "the afterimage of a bright light",
    "the sound of a kettle boiling", "a map with no legend", "the gap between two buildings",
]

_STORYTELLING_TEMPLATES = [
    "Tell a story that begins with: {hook}",
    "Create a story around the object: {object}.",
    "Write a story where the protagonist must {challenge}.",
    "Tell a story set in {setting}.",
    "Write a story involving a {character} and a {object}.",
    "Create a tale based on the theme: {theme}.",
    "Tell a story in the second person about {topic}.",
    "Write a story with an unreliable narrator who {topic}.",
    "Create a story using only dialogue about {topic}.",
    "Tell a story that loops back to its beginning about {topic}.",
    "Write a mystery where the clue is {object}.",
    "Create a fable teaching that {theme}.",
    "Tell a ghost story set in {setting}.",
    "Write a romance constrained by {challenge}.",
    "Create a heist story involving {object}.",
    "Tell a survival story in {setting}.",
    "Write a comedy of errors about {topic}.",
    "Create a tragedy centered on {character}.",
    "Tell an adventure story where the goal is {challenge}.",
    "Write a slice-of-life story featuring {object}.",
]

_STORYTELLING_ELEMENTS = {
    "hooks": [
        "The letter arrived fifty years too late.", "She woke up with someone else's memories.",
        "The lighthouse keeper was the last to know.", "He sold his shadow for a map.",
        "The train had no destination, only regrets.", "The violin played a melody no one composed.",
        "They found a door where there should have been a wall.", "The mirror showed a room that didn't exist.",
        "Her reflection blinked first.", "The dog spoke in perfect Latin.",
        "He woke up as the main character of his own unfinished novel.", "The snow fell upward.",
        "She inherited a key that opened nothing.", "The photograph aged while the subject stayed young.",
        "Every clock in the city stopped at 11:11.", "The ocean receded to reveal a staircase.",
        "He received a phone call from his future self.", "The library books rearranged themselves each night.",
        "She found her own obituary in the morning paper.", "The stars began spelling out messages.",
    ],
    "objects": [
        "a rusted compass", "an unmarked cassette tape", "a glass eye", "a book with blank pages",
        "a mechanical bird", "a jar of starlight", "a single red shoe", "a key made of ice",
        "a pocket watch that runs backward", "a mask with no eyeholes", "a map drawn in invisible ink",
        "a music box that plays forgotten songs", "a candle that never burns down", "a coin with no face",
        "a telescope that sees the past", "a quilt stitched with names", "a sealed letter from a traitor",
        "a bottle containing a storm", "a violin string made of silver hair", "a chess piece carved from bone",
    ],
    "settings": [
        "a city floating on a giant lily pad", "a library at the bottom of the sea", "a circus that only appears at dawn",
        "a hotel with infinite rooms", "a Mars colony in its third generation", "a village where no one sleeps",
        "a space station orbiting a dying star", "a forest where trees whisper secrets", "a desert of black sand",
        "a subway system connecting parallel worlds", "a clock tower stuck between seconds",
        "a greenhouse growing extinct species", "a museum of lost things", "a prison built inside a mountain of ice",
        "a marketplace in a cloud city", "a theater where actors become their roles",
        "a research station in a sentient swamp", "a castle made entirely of mirrors",
        "a graveyard for decommissioned robots", "a tea shop at the end of time",
    ],
    "characters": [
        "a retired astronomer", "a child who speaks with ghosts", "a chef who can't taste",
        "a locksmith with no fingers", "a cartographer afraid of open spaces", "a lighthouse keeper who is blind",
        "a translator who forgets their native tongue", "a firefighter who starts fires in dreams",
        "a beekeeper allergic to honey", "a mortician who collects last words", "a sailor terrified of water",
        "a clockmaker who cannot tell time", "a gardener who grows only weeds", "a musician who hears colors",
        "a detective who believes they are fictional", "a midwife who delivers stars",
        "a baker whose bread makes people cry", "a pilot navigating by memory alone",
        "a teacher instructing empty desks", "a weaver whose tapestries predict the future",
    ],
    "challenges": [
        "deliver a message to a moving island", "steal the color blue from the sky",
        "convince a mountain to move", "find the source of a sound that hasn't been made yet",
        "return a borrowed shadow", "repair a broken promise", "outrun their own reflection",
        "bargain with a storm", "learn the true name of the wind", "wake someone from a sleep that lasts centuries",
        "navigate a labyrinth that changes with every step", "speak a language that erases memories",
        "plant a garden in a desert of salt", "catch a falling star without burning",
        "apologize to someone who no longer exists", "translate a book written by the ocean",
        "find the edge of a circular world", "mend a tear in the fabric of a dream",
        "return home when home keeps moving", "prove that a lie is actually true",
    ],
    "themes": [
        "the cost of immortality", "the silence between generations", "the weight of unspoken words",
        "the geometry of loneliness", "the persistence of memory", "the fragility of trust",
        "the duality of creation and destruction", "the illusion of control", "the burden of foresight",
        "the redemption of the irredeemable", "the comedy of cosmic insignificance",
        "the tragedy of perfect understanding", "the beauty of decay", "the terror of absolute freedom",
        "the comfort of routine", "the violence of change", "the politics of grief",
        "the economics of dreams", "the sociology of solitude", "the archaeology of the present",
    ],
}

_TECH_DOC_TEMPLATES = [
    "Write API documentation for {topic}.",
    "Create a README for a project that {topic}.",
    "Document the deployment process for {topic}.",
    "Write a troubleshooting guide for {topic}.",
    "Create a system architecture diagram description for {topic}.",
    "Write a changelog entry for {topic}.",
    "Document the configuration options for {topic}.",
    "Create an onboarding guide for developers working on {topic}.",
    "Write a runbook for incident response to {topic}.",
    "Document the data schema for {topic}.",
    "Create a glossary of terms for {topic}.",
    "Write performance benchmarks documentation for {topic}.",
    "Document the security considerations for {topic}.",
    "Create a migration guide from old to new {topic}.",
    "Write a quick-start tutorial for {topic}.",
    "Document the testing strategy for {topic}.",
    "Create a dependency map for {topic}.",
    "Write a post-mortem template for {topic} failures.",
    "Document the rollback procedure for {topic}.",
    "Create a comparison table of features for {topic}.",
]

_TECH_DOC_TOPICS = [
    "a microservices orchestration platform", "a real-time event streaming system", "a containerized ML inference pipeline",
    "a serverless payment processing API", "a distributed key-value store", "a blockchain-based identity provider",
    "a multi-tenant SaaS dashboard", "a CI/CD platform with canary deployments", "an edge caching CDN",
    "a federated graph query engine", "a time-series database for IoT metrics", "a recommendation service",
    "a policy-as-code enforcement engine", "a zero-trust network gateway", "a low-code workflow automation tool",
    "a vector database for semantic search", "a data lineage tracking system", "a secrets management vault",
    "a chaos engineering testing framework", "a blue-green deployment controller", "a distributed tracing collector",
    "a configuration drift detector", "a cost optimization analyzer for cloud resources", "a multi-region database replication setup",
    "a feature flag management service", "an API gateway with rate limiting", "a batch processing scheduler",
    "a real-time collaborative text editor backend", "a video transcoding pipeline", "a semantic versioning bot",
    "a dependency vulnerability scanner", "a infrastructure-as-code validation tool", "a log aggregation and indexing system",
    "a mobile push notification dispatcher", "a webhook delivery retry service", "a certificate rotation manager",
    "a data anonymization pipeline for GDPR compliance", "a synthetic monitoring probe system", "a capacity planning simulator",
    "a cross-platform SDK for in-app purchases", "a robotic process automation controller", "a quantum-resistant encryption library",
    "a voice-to-text transcription service", "a document parsing and extraction API", "a multi-model database adapter",
    "a continuous profiling agent", "a service mesh traffic manager", "a load testing orchestrator",
    "a code review automation assistant", "a package registry with provenance tracking", "a distributed locking service",
]

_EMAIL_TEMPLATES = [
    "Write a professional email to {recipient} about {topic}.",
    "Draft a follow-up email regarding {topic}.",
    "Compose an introduction email between {recipient_a} and {recipient_b}.",
    "Write a rejection email for {topic} with empathy.",
    "Create an announcement email about {topic}.",
    "Draft a meeting request email for {topic}.",
    "Write an apology email concerning {topic}.",
    "Compose a thank-you email for {topic}.",
    "Draft a newsletter issue about {topic}.",
    "Write a cold outreach email for {topic}.",
    "Create a project update email for {topic}.",
    "Draft a leave request email for {topic}.",
    "Write a feedback request email about {topic}.",
    "Compose a complaint email regarding {topic}.",
    "Draft a resignation email citing {topic}.",
    "Write a welcome email for new {recipient}.",
    "Create a reminder email about upcoming {topic}.",
    "Draft a collaboration proposal email for {topic}.",
    "Write a farewell email mentioning {topic}.",
    "Compose an escalation email about {topic}.",
]

_EMAIL_RECIPIENTS = [
    "a potential client", "the engineering team", "the board of directors", "a job applicant",
    "a dissatisfied customer", "a vendor", "the marketing department", "a mentor",
    "a new hire", "a journalist", "an investor", "a regulatory body",
    "a conference organizer", "a university professor", "a startup founder", "a government agency",
    "a partner company", "a freelance contractor", "the support team", "a competitor (diplomatically)",
]

_EMAIL_TOPICS = [
    "a delayed product launch", "a budget overrun", "a new partnership opportunity", "a server outage",
    "a contract renewal", "a change in project scope", "a request for proposal", "a positive quarterly report",
    "a compliance audit finding", "a team restructuring", "a security vulnerability disclosure", "a patent filing",
    "a customer success story", "a recruitment drive", "a software license expiration", "a data breach notification",
    "a conference speaking invitation", "a merger announcement", "a remote work policy update", "a product recall",
    "a milestone celebration", "a training workshop", "a feedback survey", "a holiday schedule",
    "an invoice discrepancy", "a technical specification review", "a media inquiry", "a sponsorship request",
    "an office relocation", "a health and safety update", "a code of conduct reminder", "a strategic pivot",
    "a beta testing invitation", "a service level agreement review", "a donation request", "a press release",
    "an award nomination", "a disciplinary hearing", "a mentorship match", "a sustainability initiative",
    "a system maintenance window", "a pricing change", "a new feature rollout", "a network upgrade",
    "a vendor evaluation", "a user research interview request", "a diversity and inclusion report", "a crisis communication",
    "a knowledge base update", "a retirement announcement", "a customer advisory board invitation",
]

_PRODUCT_DESC_TEMPLATES = [
    "Write a product description for {product}.",
    "Create a value proposition for {product}.",
    "Draft a feature list for {product}.",
    "Write a comparison of {product_a} vs {product_b}.",
    "Create a use-case scenario for {product}.",
    "Write an FAQ section for {product}.",
    "Draft a technical specification overview for {product}.",
    "Write a customer testimonial template for {product}.",
    "Create a launch announcement for {product}.",
    "Write a pricing page description for {product}.",
    "Draft a return policy explanation for {product}.",
    "Write a setup guide introduction for {product}.",
    "Create a warranty summary for {product}.",
    "Write a 'About this item' section for {product}.",
    "Draft a competitive advantage statement for {product}.",
    "Write a sustainability note for {product}.",
    "Create an unboxing experience description for {product}.",
    "Write a referral program pitch for {product}.",
    "Draft a changelog highlights for {product}.",
    "Write a case study introduction featuring {product}.",
]

_PRODUCTS = [
    "noise-canceling over-ear headphones", "a smart indoor herb garden", "a foldable electric bicycle",
    "a portable espresso maker", "an AI-powered language tutor device", "a UV-C sanitizing wand",
    "a programmable mechanical keyboard", "a solar-powered phone charger", "a biometric smart lock",
    "a standing desk converter", "a robot vacuum with mop function", "a handheld digital microscope",
    "a smart water bottle with hydration reminders", "a wireless charging desk pad", "a pocket-sized projector",
    "an ergonomic vertical mouse", "a Bluetooth tracking tag", "a smart sleep mask with light therapy",
    "a portable air quality monitor", "a self-cleaning water bottle", "a mini thermal printer",
    "a gesture-controlled drone", "a smart notebook with cloud sync", "a wearable posture corrector",
    "a compact cold brew coffee maker", "a UV phone sanitizer box", "a digital luggage scale",
    "a Bluetooth meat thermometer", "a smart plant moisture sensor", "a foldable Bluetooth keyboard",
    "a portable neck fan", "a laser keyboard projector", "a smart ring for fitness tracking",
    "a handheld stabilizer for smartphones", "a solar camping lantern", "a voice-activated smart plug",
    "a wireless car charger mount", "a pet camera with treat dispenser", "a compact smoothie blender",
    "a smart alarm clock with sunrise simulation", "a portable ozone generator", "a digital tape measure",
    "a rechargeable hand warmer", "a smart meat defrosting tray", "a mini electric screwdriver set",
    "a UV toothbrush sanitizer", "a foldable silicone water bottle", "a smart home air purifier",
    "a portable document scanner", "a wireless presentation clicker", "a magnetic cable organizer",
]

_NEWS_TEMPLATES = [
    "Write a breaking news headline and lede about {topic}.",
    "Draft a news article on {topic} in AP style.",
    "Create an investigative journalism pitch for {topic}.",
    "Write an opinion piece about {topic}.",
    "Draft a human-interest story about {topic}.",
    "Write a science news summary on {topic}.",
    "Create a business news brief about {topic}.",
    "Draft a political analysis of {topic}.",
    "Write a technology news update on {topic}.",
    "Create a health news report about {topic}.",
    "Write an environmental news story on {topic}.",
    "Draft a sports news recap about {topic}.",
    "Write an entertainment news snippet about {topic}.",
    "Create an education news piece on {topic}.",
    "Draft an international news summary of {topic}.",
    "Write a local news brief about {topic}.",
    "Create a financial markets update on {topic}.",
    "Write a cultural commentary on {topic}.",
    "Draft a legal news report about {topic}.",
    "Write a weather-related news story on {topic}.",
]

_NEWS_TOPICS = [
    "a breakthrough in fusion energy", "a major cyberattack on infrastructure", "a new trade agreement between continents",
    "a volcanic eruption disrupting air travel", "a significant archaeological discovery", "a stock market flash crash",
    "a multinational corporate merger", "a controversial election result", "a landmark Supreme Court ruling",
    "a novel virus outbreak in a remote region", "a successful Mars sample return mission", "a nationwide teacher strike",
    "a recall of a popular consumer vehicle", "a historic peace treaty signing", "a massive data privacy scandal",
    "a revolutionary cancer treatment approval", "a sudden change in central bank policy", "a devastating earthquake response",
    "a surge in renewable energy adoption", "a ban on a widely used chemical", "a breakthrough in room-temperature superconductivity",
    "a high-profile corporate bankruptcy", "a new immigration policy rollout", "a major sports championship upset",
    "a discovery of an uncontacted tribe", "a satellite collision creating debris", "a ransomware attack on hospitals",
    "a new antibiotic discovery", "a cryptocurrency exchange collapse", "a controversial art auction record",
    "a space tourism accident", "a reforestation initiative exceeding goals", "a labor union victory in tech industry",
    "a global shipping lane blockage", "a controversial policing policy", "a new particle discovered at CERN",
    "a food safety scandal affecting multiple brands", "a diplomatic crisis involving embassy closures",
    "a record-breaking heatwave across continents", "a successful deep-sea conservation treaty",
    "a major airline fleet grounding", "a new social media regulation law", "a quantum internet demonstration",
    "a humanitarian crisis at a border", "a revolutionary battery factory opening", "a collapse of a regional banking system",
    "a successful gene therapy for inherited blindness", "a new polar research station established",
    "a cultural heritage site destroyed by fire", "a shift in global rare earth supply chains",
    "a record number of women elected to parliament",
]

_HISTORY_TEMPLATES = [
    "Describe the causes of {event}.",
    "What were the major consequences of {event}?",
    "Who were the key figures in {event}?",
    "How did {event_a} lead to {event_b}?",
    "Compare {event_a} and {event_b}.",
    "What would have happened if {event} had a different outcome?",
    "Analyze the primary sources for {event}.",
    "What role did technology play in {event}?",
    "How did {event} affect everyday people?",
    "What are the historiographical debates about {event}?",
    "Describe the cultural impact of {event}.",
    "How is {event} remembered differently across nations?",
    "What economic factors contributed to {event}?",
    "Describe the military strategies used in {event}.",
    "How did {event} change the political map?",
    "What propaganda was used during {event}?",
    "Describe the social conditions before {event}.",
    "How did {event} influence later movements?",
    "What artifacts survive from {event}?",
    "Write a timeline of {event}.",
]

_HISTORY_EVENTS = [
    "the fall of the Berlin Wall", "the French Revolution", "the Industrial Revolution", "the Meiji Restoration",
    "the American Civil War", "the Russian Revolution of 1917", "the signing of the Magna Carta",
    "the Black Death pandemic", "the Renaissance", "the Protestant Reformation", "the Opium Wars",
    "the Scramble for Africa", "the Cuban Missile Crisis", "the Apollo 11 moon landing",
    "the invention of the printing press", "the Haitian Revolution", "the unification of Germany",
    "the Great Depression", "the decolonization of India", "the fall of the Roman Empire",
    "the Mongol conquests", "the Columbian Exchange", "the English Civil War", "the Congress of Vienna",
    "the Taiping Rebellion", "the Emancipation Proclamation", "the Treaty of Versailles",
    "the Iranian Revolution of 1979", "the end of apartheid in South Africa", "the dissolution of Yugoslavia",
    "the construction of the Great Wall of China", "the Crusades", "the Silk Road trade network",
    "the storming of the Bastille", "the Louisiana Purchase", "the Battle of Waterloo",
    "the Berlin Conference of 1884", "the launch of Sputnik", "the Chernobyl disaster",
    "the invention of the World Wide Web", "the Boston Tea Party", "the Easter Rising of 1916",
    "the Partition of India", "the Soweto Uprising", "the Prague Spring", "the Rwandan genocide",
    "the fall of Constantinople", "the D-Day landings", "the Marshall Plan",
    "the Seneca Falls Convention", "the Salt March led by Gandhi", "the Hungarian Revolution of 1956",
]

_SCIENCE_TEMPLATES = [
    "Explain the theory of {topic}.",
    "What is the evidence for {topic}?",
    "Describe the experimental method used to study {topic}.",
    "What are the current hypotheses about {topic}?",
    "How does {topic} relate to {topic_b}?",
    "What are the practical applications of {topic}?",
    "Describe a recent discovery in {topic}.",
    "What technologies rely on {topic}?",
    "Explain the mathematics behind {topic}.",
    "What are the limitations of our understanding of {topic}?",
    "How did scientists first discover {topic}?",
    "What models are used to represent {topic}?",
    "Describe the controversy surrounding {topic}.",
    "What future research is needed for {topic}?",
    "How does {topic} impact climate change?",
    "Explain {topic} at a high school level.",
    "What instruments measure {topic}?",
    "Describe the chemical/physical/biological process of {topic}.",
    "What role does {topic} play in the universe?",
    "Summarize a peer-reviewed paper on {topic}.",
]

_SCIENCE_TOPICS = [
    "general relativity", "CRISPR-Cas9 gene editing", "photosynthesis", "plate tectonics",
    "quantum entanglement", "the human microbiome", "dark energy", "neuroplasticity",
    "climate feedback loops", "superconductivity", "evolutionary adaptation", "the Higgs boson",
    "ocean acidification", "stem cell differentiation", "gravitational waves", "epigenetic inheritance",
    "antibiotic resistance mechanisms", "nuclear fusion reactions", "the endocrine system",
    "synthetic biology", "exoplanet detection methods", "protein folding", "the carbon cycle",
    "neutrino oscillation", "immunotherapy for cancer", "geological time scales", "the Big Bang nucleosynthesis",
    "mycelial network communication", "viral vector vaccines", "thermodynamic entropy", "speciation events",
    "neural network backpropagation", "oceanic thermohaline circulation", "the Standard Model of particle physics",
    "circadian rhythm biology", "material fatigue and fracture", "horizontal gene transfer",
    "gravitational lensing", "autophagy in cells", "chaos theory in weather", "topological insulators",
    "retroviral replication", "the nitrogen fixation process", "black hole thermodynamics",
    "crystallization kinetics", "action potential propagation", "dark matter detection",
    "photosystem II water splitting", "quasar emission mechanisms", "ecosystem trophic cascades",
]

_PHILOSOPHY_TEMPLATES = [
    "What is the nature of {topic}?",
    "Evaluate the arguments for and against {topic}.",
    "How does {philosopher} view {topic}?",
    "Is {topic} possible? Defend your answer.",
    "What are the implications of {topic} for ethics?",
    "Distinguish between different conceptions of {topic}.",
    "Can {topic} be known?",
    "What thought experiments illuminate {topic}?",
    "How has the concept of {topic} changed over time?",
    "Is {topic} a social construct?",
    "What is the relationship between {topic} and language?",
    "Does science have anything to say about {topic}?",
    "What would a skeptic say about {topic}?",
    "How does Eastern philosophy approach {topic}?",
    "Is {topic} reducible to physical processes?",
    "What is the phenomenology of {topic}?",
    "How does {topic} affect personal identity?",
    "Can {topic} be measured or quantified?",
    "What is the political significance of {topic}?",
    "How does {topic} relate to the meaning of life?",
]

_PHILOSOPHY_TOPICS = [
    "consciousness", "free will", "moral responsibility", "personal identity", "the mind-body problem",
    "knowledge", "truth", "beauty", "justice", "the good life", "causation", "time",
    "possible worlds", "existence", "nothingness", "infinity", "modality", "essence",
    "representation", "intentionality", "qualia", "selfhood", "death", "suffering",
    "happiness", "virtue", "rights", "obligation", "consent", "autonomy", "dignity",
    "trust", "forgiveness", "hope", "love", "friendship", "authority", "power",
    "equality", "liberty", "democracy", "utopia", "alienation", "authenticity",
    "absurdity", "finitude", "transcendence", "immanence", "paradox", "skepticism",
]

_ECONOMICS_TEMPLATES = [
    "Explain the concept of {topic}.",
    "What are the causes of {topic}?",
    "How does {topic} affect global markets?",
    "Analyze the policy implications of {topic}.",
    "Compare {topic_a} and {topic_b} in economic terms.",
    "What metrics are used to measure {topic}?",
    "Describe a real-world example of {topic}.",
    "How do governments respond to {topic}?",
    "What is the history of {topic} in economics?",
    "Evaluate the effectiveness of policies addressing {topic}.",
    "How does {topic} impact inequality?",
    "What role does technology play in {topic}?",
    "Explain {topic} using supply and demand.",
    "What are the unintended consequences of {topic}?",
    "How do behavioral biases influence {topic}?",
    "Describe the trade-offs involved in {topic}.",
    "What would happen if {topic} were abolished?",
    "How does {topic} interact with monetary policy?",
    "Analyze {topic} from a Marxist perspective.",
    "What is the future outlook for {topic}?",
]

_ECONOMICS_TOPICS = [
    "inflation targeting", "quantitative easing", "fiscal stimulus", "income elasticity",
    "monopoly power", "externality taxation", "labor market rigidities", "sovereign debt crises",
    "currency pegs", "capital flight", "the gig economy", "automation and unemployment",
    "carbon pricing", "universal basic assets", "housing bubbles", "pension fund solvency",
    "trade deficits", "tariff incidence", "central bank digital currencies", "shadow banking",
    "resource curse", "dutch disease", "knowledge spillovers", "network effects",
    "moral hazard in banking", "adverse selection in insurance", "rent-seeking behavior",
    "Gini coefficient trends", "purchasing power parity", "liquidity traps", "carry trades",
    "collateralized debt obligations", "contagion in financial markets", "development economics",
    "import substitution", "export-led growth", "demographic dividend", "brain drain",
    "sunk cost fallacy in policy", "loss aversion in consumer behavior", "hyperinflation dynamics",
    "oligopoly pricing strategies", "minimum wage effects", "progressive taxation efficiency",
    "public choice theory", "rational expectations", "real business cycles",
    "institutional economics", "information asymmetry in healthcare", "behavioral nudges",
    "sustainable finance taxonomy", "deglobalization risks", "cryptocurrency monetary theory",
]

_LAW_TEMPLATES = [
    "Explain the legal principle of {topic}.",
    "What is the precedent for {topic}?",
    "Analyze the constitutionality of {topic}.",
    "Compare {topic_a} and {topic_b} across jurisdictions.",
    "What are the elements of the tort/crime of {topic}?",
    "Describe the legislative history of {topic}.",
    "How is {topic} enforced in practice?",
    "What defenses are available for {topic}?",
    "Analyze a landmark case concerning {topic}.",
    "What are the policy justifications for {topic}?",
    "How does international law address {topic}?",
    "What are the remedies for {topic}?",
    "Explain the burden of proof in cases of {topic}.",
    "What role does intent play in {topic}?",
    "How has {topic} evolved with technology?",
    "Describe the procedural requirements for {topic}.",
    "What is the standard of care in {topic}?",
    "How do administrative agencies regulate {topic}?",
    "What human rights issues arise from {topic}?",
    "Draft a legal memo on {topic}.",
]

_LAW_TOPICS = [
    "negligence", "contractual breach", "fair use in copyright", "habeas corpus",
    "due process", "strict liability", "adverse possession", "promissory estoppel",
    "vicarious liability", "self-defense", "double jeopardy", "antitrust enforcement",
    "environmental impact assessments", "data protection rights", "whistleblower protections",
    "class action certification", "extradition treaties", "arbitration clauses",
    "intellectual property licensing", "product liability", "insider trading",
    "maritime jurisdiction", "consumer protection statutes", "land use zoning",
    "asylum and refugee law", "corporate personhood", "freedom of information",
    "defamation and libel", "patent obviousness", "trade secret misappropriation",
    "constitutional originalism", "judicial review scope", "sentencing guidelines",
    "juvenile detention standards", "prisoners' rights", "employment discrimination",
    "securities fraud", "money laundering regulations", "international humanitarian law",
    "territorial sovereignty disputes", "cybercrime jurisdiction", "digital evidence admissibility",
    "genetic privacy laws", "surveillance oversight", "bankruptcy priority rules",
    "fiduciary duty standards", "takings clause interpretation", "tort reform debates",
    "restorative justice programs", "legal aid accessibility", "algorithmic accountability in sentencing",
    "corporate veil piercing", "cross-border discovery", "e-signature validity",
]


# =============================================================================
# Helper Functions for Prompt Generation
# =============================================================================

def _generate_prompts_from_templates(category: str, templates: List[str], fillers: List[str], prompt_type: str = "open") -> List[Dict[str, Any]]:
    """Generate prompts by cycling through templates and fillers."""
    prompts = []
    for i in range(50):
        template = templates[i % len(templates)]
        filler = fillers[i % len(fillers)]
        prompt_text = template.format(topic=filler, problem=filler, task=filler, text=filler, event=filler,
                                      premise=filler, conclusion=filler, setting=filler, character=filler,
                                      object=filler, challenge=filler, theme=filler, product=filler,
                                      recipient=filler, hook=filler, topic_a=filler, topic_b=filler,
                                      philosopher=filler, source_lang="English", target_lang="French",
                                      language="Python")
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.3 + (i % 7) * 0.1, 2),
            "type": prompt_type,
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_storytelling_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate storytelling prompts using multiple element types."""
    prompts = []
    elems = _STORYTELLING_ELEMENTS
    keys = ["hooks", "objects", "settings", "characters", "challenges", "themes"]
    for i in range(50):
        template = _STORYTELLING_TEMPLATES[i % len(_STORYTELLING_TEMPLATES)]
        # Cycle through different element combinations
        idx = i % 20
        try:
            prompt_text = template.format(
                hook=elems["hooks"][idx],
                object=elems["objects"][idx],
                setting=elems["settings"][idx],
                character=elems["characters"][idx],
                challenge=elems["challenges"][idx],
                theme=elems["themes"][idx],
                topic=elems["themes"][idx],
            )
        except KeyError:
            # Fallback if template expects only some keys
            prompt_text = template.replace("{hook}", elems["hooks"][idx]).replace("{object}", elems["objects"][idx]).replace("{setting}", elems["settings"][idx]).replace("{character}", elems["characters"][idx]).replace("{challenge}", elems["challenges"][idx]).replace("{theme}", elems["themes"][idx]).replace("{topic}", elems["themes"][idx])
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.3 + (i % 7) * 0.1, 2),
            "type": "creative",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_email_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate email prompts using recipients and topics."""
    prompts = []
    for i in range(50):
        template = _EMAIL_TEMPLATES[i % len(_EMAIL_TEMPLATES)]
        recipient = _EMAIL_RECIPIENTS[i % len(_EMAIL_RECIPIENTS)]
        topic = _EMAIL_TOPICS[i % len(_EMAIL_TOPICS)]
        try:
            prompt_text = template.format(recipient=recipient, topic=topic, recipient_a=recipient, recipient_b=_EMAIL_RECIPIENTS[(i+1) % len(_EMAIL_RECIPIENTS)])
        except KeyError:
            prompt_text = template.replace("{recipient}", recipient).replace("{topic}", topic).replace("{recipient_a}", recipient).replace("{recipient_b}", _EMAIL_RECIPIENTS[(i+1) % len(_EMAIL_RECIPIENTS)])
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.2 + (i % 5) * 0.15, 2),
            "type": "instructional",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_product_desc_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate product description prompts."""
    prompts = []
    for i in range(50):
        template = _PRODUCT_DESC_TEMPLATES[i % len(_PRODUCT_DESC_TEMPLATES)]
        product = _PRODUCTS[i % len(_PRODUCTS)]
        product_b = _PRODUCTS[(i + 1) % len(_PRODUCTS)]
        try:
            prompt_text = template.format(product=product, product_a=product, product_b=product_b)
        except KeyError:
            prompt_text = template.replace("{product}", product).replace("{product_a}", product).replace("{product_b}", product_b)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.2 + (i % 6) * 0.12, 2),
            "type": "marketing",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_debate_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate debate prompts."""
    prompts = []
    for i in range(50):
        template = _DEBATE_TEMPLATES[i % len(_DEBATE_TEMPLATES)]
        topic = _DEBATE_TOPICS[i % len(_DEBATE_TOPICS)]
        try:
            prompt_text = template.format(topic=topic, topic_a=topic, topic_b=_DEBATE_TOPICS[(i+1) % len(_DEBATE_TOPICS)])
        except KeyError:
            prompt_text = template.replace("{topic}", topic).replace("{topic_a}", topic).replace("{topic_b}", _DEBATE_TOPICS[(i+1) % len(_DEBATE_TOPICS)])
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.4 + (i % 6) * 0.1, 2),
            "type": "argumentative",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_analysis_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate analysis prompts."""
    prompts = []
    for i in range(50):
        template = _ANALYSIS_TEMPLATES[i % len(_ANALYSIS_TEMPLATES)]
        topic = _ANALYSIS_TOPICS[i % len(_ANALYSIS_TOPICS)]
        topic_b = _ANALYSIS_TOPICS[(i + 1) % len(_ANALYSIS_TOPICS)]
        try:
            prompt_text = template.format(topic=topic, topic_a=topic, topic_b=topic_b)
        except KeyError:
            prompt_text = template.replace("{topic}", topic).replace("{topic_a}", topic).replace("{topic_b}", topic_b)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.3 + (i % 7) * 0.1, 2),
            "type": "analytical",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_reasoning_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate reasoning prompts."""
    prompts = []
    for i in range(50):
        template = _REASONING_TEMPLATES[i % len(_REASONING_TEMPLATES)]
        premise = _REASONING_PREMISES[i % len(_REASONING_PREMISES)]
        conclusion = "therefore the theory is correct"
        topic = _REASONING_PREMISES[(i + 3) % len(_REASONING_PREMISES)]
        topic_b = _REASONING_PREMISES[(i + 5) % len(_REASONING_PREMISES)]
        try:
            prompt_text = template.format(premise=premise, conclusion=conclusion, topic=topic, topic_a=topic, topic_b=topic_b)
        except KeyError:
            prompt_text = template.replace("{premise}", premise).replace("{conclusion}", conclusion).replace("{topic}", topic).replace("{topic_a}", topic).replace("{topic_b}", topic_b)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.4 + (i % 6) * 0.1, 2),
            "type": "logical",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_translation_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate translation prompts."""
    prompts = []
    langs = ["Spanish", "French", "German", "Japanese", "Chinese", "Arabic", "Russian", "Portuguese", "Italian", "Korean"]
    for i in range(50):
        template = _TRANSLATION_TEMPLATES[i % len(_TRANSLATION_TEMPLATES)]
        text = _TRANSLATION_TEXTS[i % len(_TRANSLATION_TEXTS)]
        target_lang = langs[i % len(langs)]
        try:
            prompt_text = template.format(text=text, target_lang=target_lang, source_lang="English")
        except KeyError:
            prompt_text = template.replace("{text}", text).replace("{target_lang}", target_lang).replace("{source_lang}", "English")
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.2 + (i % 5) * 0.15, 2),
            "type": "translation",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_summarization_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate summarization prompts."""
    prompts = []
    for i in range(50):
        template = _SUMMARIZATION_TEMPLATES[i % len(_SUMMARIZATION_TEMPLATES)]
        text = _SUMMARIZATION_TEXTS[i % len(_SUMMARIZATION_TEXTS)]
        try:
            prompt_text = template.format(text=text)
        except KeyError:
            prompt_text = template.replace("{text}", text)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.2 + (i % 5) * 0.15, 2),
            "type": "summarization",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_history_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate history prompts."""
    prompts = []
    for i in range(50):
        template = _HISTORY_TEMPLATES[i % len(_HISTORY_TEMPLATES)]
        event = _HISTORY_EVENTS[i % len(_HISTORY_EVENTS)]
        event_b = _HISTORY_EVENTS[(i + 1) % len(_HISTORY_EVENTS)]
        try:
            prompt_text = template.format(event=event, event_a=event, event_b=event_b)
        except KeyError:
            prompt_text = template.replace("{event}", event).replace("{event_a}", event).replace("{event_b}", event_b)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.3 + (i % 7) * 0.1, 2),
            "type": "historical",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_science_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate science prompts."""
    prompts = []
    for i in range(50):
        template = _SCIENCE_TEMPLATES[i % len(_SCIENCE_TEMPLATES)]
        topic = _SCIENCE_TOPICS[i % len(_SCIENCE_TOPICS)]
        topic_b = _SCIENCE_TOPICS[(i + 1) % len(_SCIENCE_TOPICS)]
        try:
            prompt_text = template.format(topic=topic, topic_b=topic_b)
        except KeyError:
            prompt_text = template.replace("{topic}", topic).replace("{topic_b}", topic_b)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.4 + (i % 6) * 0.1, 2),
            "type": "scientific",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_philosophy_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate philosophy prompts."""
    prompts = []
    philosophers = ["Plato", "Aristotle", "Kant", "Hume", "Descartes", "Nietzsche", "Wittgenstein", "Sartre", "Confucius", "De Beauvoir"]
    for i in range(50):
        template = _PHILOSOPHY_TEMPLATES[i % len(_PHILOSOPHY_TEMPLATES)]
        topic = _PHILOSOPHY_TOPICS[i % len(_PHILOSOPHY_TOPICS)]
        philosopher = philosophers[i % len(philosophers)]
        try:
            prompt_text = template.format(topic=topic, philosopher=philosopher)
        except KeyError:
            prompt_text = template.replace("{topic}", topic).replace("{philosopher}", philosopher)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.5 + (i % 5) * 0.1, 2),
            "type": "philosophical",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_economics_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate economics prompts."""
    prompts = []
    for i in range(50):
        template = _ECONOMICS_TEMPLATES[i % len(_ECONOMICS_TEMPLATES)]
        topic = _ECONOMICS_TOPICS[i % len(_ECONOMICS_TOPICS)]
        topic_b = _ECONOMICS_TOPICS[(i + 1) % len(_ECONOMICS_TOPICS)]
        try:
            prompt_text = template.format(topic=topic, topic_a=topic, topic_b=topic_b)
        except KeyError:
            prompt_text = template.replace("{topic}", topic).replace("{topic_a}", topic).replace("{topic_b}", topic_b)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.3 + (i % 7) * 0.1, 2),
            "type": "economic",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_law_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate law prompts."""
    prompts = []
    for i in range(50):
        template = _LAW_TEMPLATES[i % len(_LAW_TEMPLATES)]
        topic = _LAW_TOPICS[i % len(_LAW_TOPICS)]
        topic_b = _LAW_TOPICS[(i + 1) % len(_LAW_TOPICS)]
        try:
            prompt_text = template.format(topic=topic, topic_a=topic, topic_b=topic_b)
        except KeyError:
            prompt_text = template.replace("{topic}", topic).replace("{topic_a}", topic).replace("{topic_b}", topic_b)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.4 + (i % 6) * 0.1, 2),
            "type": "legal",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_poetry_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate poetry prompts."""
    prompts = []
    for i in range(50):
        template = _POETRY_TEMPLATES[i % len(_POETRY_TEMPLATES)]
        topic = _POETRY_TOPICS[i % len(_POETRY_TOPICS)]
        try:
            prompt_text = template.format(topic=topic)
        except KeyError:
            prompt_text = template.replace("{topic}", topic)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.3 + (i % 7) * 0.1, 2),
            "type": "poetic",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_coding_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate coding prompts with language and task variations."""
    prompts = []
    languages = ["Python", "JavaScript", "Java", "C++", "Go", "Rust", "TypeScript", "Ruby", "Swift", "Kotlin"]
    for i in range(50):
        template = _CODING_TEMPLATES[i % len(_CODING_TEMPLATES)]
        task = _CODING_TASKS[i % len(_CODING_TASKS)]
        lang = languages[i % len(languages)]
        try:
            prompt_text = template.format(task=task, language=lang)
        except KeyError:
            prompt_text = template.replace("{task}", task).replace("{language}", lang)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.3 + (i % 7) * 0.1, 2),
            "type": "coding",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_math_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate math prompts."""
    prompts = []
    for i in range(50):
        template = _MATH_TEMPLATES[i % len(_MATH_TEMPLATES)]
        problem = _MATH_PROBLEMS[i % len(_MATH_PROBLEMS)]
        try:
            prompt_text = template.format(problem=problem)
        except KeyError:
            prompt_text = template.replace("{problem}", problem)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.3 + (i % 7) * 0.1, 2),
            "type": "mathematical",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_creative_writing_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate creative writing prompts."""
    prompts = []
    for i in range(50):
        template = _CREATIVE_WRITING_TEMPLATES[i % len(_CREATIVE_WRITING_TEMPLATES)]
        topic = _CREATIVE_WRITING_TOPICS[i % len(_CREATIVE_WRITING_TOPICS)]
        try:
            prompt_text = template.format(topic=topic)
        except KeyError:
            prompt_text = template.replace("{topic}", topic)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.2 + (i % 5) * 0.15, 2),
            "type": "creative",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_factual_qa_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate factual QA prompts."""
    prompts = []
    for i in range(50):
        template = _FACTUAL_QA_TEMPLATES[i % len(_FACTUAL_QA_TEMPLATES)]
        topic = _FACTUAL_QA_TOPICS[i % len(_FACTUAL_QA_TOPICS)]
        try:
            prompt_text = template.format(topic=topic)
        except KeyError:
            prompt_text = template.replace("{topic}", topic)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.2 + (i % 5) * 0.15, 2),
            "type": "factual",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_news_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate news prompts."""
    prompts = []
    for i in range(50):
        template = _NEWS_TEMPLATES[i % len(_NEWS_TEMPLATES)]
        topic = _NEWS_TOPICS[i % len(_NEWS_TOPICS)]
        try:
            prompt_text = template.format(topic=topic)
        except KeyError:
            prompt_text = template.replace("{topic}", topic)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.3 + (i % 7) * 0.1, 2),
            "type": "journalistic",
            "prompt_text": prompt_text,
        })
    return prompts


def _generate_tech_doc_prompts(category: str) -> List[Dict[str, Any]]:
    """Generate technical documentation prompts."""
    prompts = []
    for i in range(50):
        template = _TECH_DOC_TEMPLATES[i % len(_TECH_DOC_TEMPLATES)]
        topic = _TECH_DOC_TOPICS[i % len(_TECH_DOC_TOPICS)]
        try:
            prompt_text = template.format(topic=topic)
        except KeyError:
            prompt_text = template.replace("{topic}", topic)
        prompts.append({
            "id": f"{category}_{i+1:03d}",
            "category": category,
            "difficulty": round(0.3 + (i % 7) * 0.1, 2),
            "type": "technical",
            "prompt_text": prompt_text,
        })
    return prompts


# =============================================================================
# Prompt Library Assembly
# =============================================================================

PROMPT_LIBRARY: Dict[str, List[Dict[str, Any]]] = {
    "coding": _generate_coding_prompts("coding"),
    "math": _generate_math_prompts("math"),
    "creative_writing": _generate_creative_writing_prompts("creative_writing"),
    "factual_qa": _generate_factual_qa_prompts("factual_qa"),
    "reasoning": _generate_reasoning_prompts("reasoning"),
    "translation": _generate_translation_prompts("translation"),
    "summarization": _generate_summarization_prompts("summarization"),
    "analysis": _generate_analysis_prompts("analysis"),
    "debate": _generate_debate_prompts("debate"),
    "poetry": _generate_poetry_prompts("poetry"),
    "storytelling": _generate_storytelling_prompts("storytelling"),
    "tech_doc": _generate_tech_doc_prompts("tech_doc"),
    "email": _generate_email_prompts("email"),
    "product_desc": _generate_product_desc_prompts("product_desc"),
    "news": _generate_news_prompts("news"),
    "history": _generate_history_prompts("history"),
    "science": _generate_science_prompts("science"),
    "philosophy": _generate_philosophy_prompts("philosophy"),
    "economics": _generate_economics_prompts("economics"),
    "law": _generate_law_prompts("law"),
}


# =============================================================================
# Public API
# =============================================================================

def get_prompts_by_category(category: str, limit: Optional[int] = None, difficulty_min: float = 0.0, difficulty_max: float = 1.0) -> List[Dict[str, Any]]:
    """
    Retrieve prompts filtered by category, optional limit, and difficulty range.

    Args:
        category: One of the predefined category names.
        limit: Maximum number of prompts to return.
        difficulty_min: Minimum difficulty (inclusive).
        difficulty_max: Maximum difficulty (inclusive).

    Returns:
        A list of prompt dictionaries matching the filters.
    """
    if category not in PROMPT_LIBRARY:
        raise ValueError(f"Unknown category: {category}. Available: {list(PROMPT_LIBRARY.keys())}")
    filtered = [
        p for p in PROMPT_LIBRARY[category]
        if difficulty_min <= p["difficulty"] <= difficulty_max
    ]
    if limit is not None:
        filtered = filtered[:limit]
    return filtered


def get_random_prompts(n: int = 1, categories: Optional[List[str]] = None, seed: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Retrieve n random prompts from the library.

    Args:
        n: Number of random prompts to retrieve.
        categories: Optional list of category names to sample from.
        seed: Optional random seed for reproducibility.

    Returns:
        A list of randomly selected prompt dictionaries.
    """
    if seed is not None:
        random.seed(seed)
    if categories is None:
        pool = [p for cat_prompts in PROMPT_LIBRARY.values() for p in cat_prompts]
    else:
        pool = []
        for cat in categories:
            if cat not in PROMPT_LIBRARY:
                raise ValueError(f"Unknown category: {cat}")
            pool.extend(PROMPT_LIBRARY[cat])
    if n > len(pool):
        n = len(pool)
    return random.sample(pool, n)


def get_all_prompts() -> List[Dict[str, Any]]:
    """Return all prompts in the library as a flat list."""
    return [p for cat_prompts in PROMPT_LIBRARY.values() for p in cat_prompts]


def export_library_to_json(filepath: str) -> None:
    """Export the entire prompt library to a JSON file."""
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(PROMPT_LIBRARY, f, ensure_ascii=False, indent=2)


def get_categories() -> List[str]:
    """Return a list of all available category names."""
    return list(PROMPT_LIBRARY.keys())


# =============================================================================
# Module entry point for quick testing
# =============================================================================

if __name__ == "__main__":
    print(f"Total categories: {len(PROMPT_LIBRARY)}")
    for cat, prompts in PROMPT_LIBRARY.items():
        print(f"  {cat}: {len(prompts)} prompts")
    print(f"Total prompts: {len(get_all_prompts())}")
    sample = get_random_prompts(3)
    for s in sample:
        print(f"\n[{s['category']}] {s['id']} (diff={s['difficulty']}): {s['prompt_text'][:80]}...")
