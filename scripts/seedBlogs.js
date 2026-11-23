// scripts/seedBlogs.js
require("dotenv").config();
const mongoose = require("mongoose");
const Blog = require("../models/blogModel");

const STATIC_BLOG_POSTS = [
  {
    slug: "5-amazing-facts-you-probably-dont-know-about-wiz-ofuasia",
    title: "5 Amazing Facts You Probably Don't Know About Wiz Ofuasia",
    excerpt:
      "From his childhood nickname 'Big Boy' and his first guitar in the church choir to spending 8 months crafting Jacuzzi ft. Ice Prince, discover 5 facts about Wiz Ofuasia (Wizboyy).",
    date: "May 10, 2022",
    isoDate: "2022-05-10T03:05:12+00:00",
    category: "Articles",
    author: "Wiz Ofuasia Editorial",
    readTime: "4 min read",
    coverImage: "/images/gallery/wizolingo1.jpg",
    tags: ["Wiz Ofuasia", "Wizboyy", "Biography", "Jacuzzi", "Facts"],
    contentParagraphs: [
      "Wiz Ofuasia is a Nigerian-born singer, songwriter, multi-instrumentalist, and producer widely celebrated for his chart-topping Highlife and Afrobeats anthems, including his breakthrough classic 'One Plus One'. Born Isioma Ofuasia and affectionately known across Africa and the diaspora as Wizboyy, his music bridges traditional West African rhythms with crisp, modern production.",
      "While fans know his signature melodies, vibrant hooks, and commanding live presence, there is a rich story behind the studio discipline and family roots that shaped him. Here are five remarkable facts about Wiz Ofuasia's artistic journey:",
      "1. His Childhood Nickname — 'Big Boy': Long before packed concert halls and international festival stages, Wiz Ofuasia's parents gave him the affectionate nickname 'Big Boy'. Even after decades of global touring and acclaim, his parents still call him 'Big Boy' to this day.",
      "2. Sierra Leone Was His First International Tour Destination: In 2011, Wiz Ofuasia took his sound beyond Nigeria for the very first time when he traveled to Sierra Leone. His electrifying connection with audiences led to a return invitation during Sierra Leone's 50th Independence Day celebrations as a featured guest artist — a milestone that propelled his international touring career across more than 25 countries.",
      "3. Raised in Music From Age 6: Music wasn't a late hobby for Wiz Ofuasia — it was his first language. Raised by a musically gifted mother and a devoted church singer who brought him to choir rehearsals at age 6, he officially joined the church choir at age 8. There, he mastered foundational solfa notation, vocal harmony, and musical composition long before stepping into a commercial recording booth.",
      "4. His Very First Instrument Was the Guitar: Though today's fans often see him directing full live bands and layering complex studio arrangements, the very first instrument Wiz Ofuasia ever learned was the guitar. Those early acoustic chord progressions still inform the warm, melodic Highlife guitar lines heard throughout his discography.",
      "5. Eight Months Crafting 'Jacuzzi' ft. Ice Prince: In an industry where singles are often rushed out in days, Wiz Ofuasia treats songwriting and sound design as fine craftsmanship. While most records take around three months from concept to master, his beloved collaboration 'Jacuzzi' featuring award-winning rapper Ice Prince took nearly 8 months of meticulous writing, arrangement, and vocal layering — the longest he has ever spent perfecting a single track.",
      "Whether performing with a full live band or producing fresh records through Wizolingo Music, these early lessons in patience, musicality, and heritage continue to define every chapter of Wiz Ofuasia's sound.",
    ],
  },
  {
    slug: "wiz-ofuasia-wizboy-aso-rock-dallas",
    title: "Wiz Ofuasia (Wizboyy) Live at Aso Rock Dallas!",
    excerpt:
      "Multitalented artist Wiz Ofuasia (Wizboyy) thrilled fans in Dallas, Texas with an unforgettable live performance at the Aso Rock Dallas event.",
    date: "March 17, 2022",
    isoDate: "2022-03-17T22:30:10+00:00",
    category: "Events & Live",
    author: "Wiz Ofuasia Editorial",
    readTime: "3 min read",
    coverImage: "/images/gallery/wiz_event.jpg",
    tags: ["Live Performance", "Dallas", "USA Tour", "Aso Rock"],
    contentParagraphs: [
      "On March 12, 2022, Wiz Ofuasia (Wizboyy) delivered an unforgettable headline showcase at the Aso Rock Dallas event in Dallas, Texas, bringing together fans from across the North American diaspora for a night of pure Highlife and Afrobeats energy.",
      "From the moment he stepped onto the stage, the crowd responded to every horn stab, guitar riff, and percussive groove. Blending timeless fan favorites like 'One Plus One' and 'Infinity' with high-tempo live arrangements, Wiz turned the venue into a full-voiced singalong.",
      "What sets a Wiz Ofuasia live performance apart is his background as both a producer and multi-instrumentalist. Rather than relying solely on backing tracks, he treats every live set as a dynamic conversation with the audience — extending call-and-response refrains, improvising vocal runs, and building moments of genuine connection.",
      "The Aso Rock Dallas appearance stood out as one of the defining highlights of his 2022 US run, reinforcing his reputation as one of Afrobeats and Highlife's most engaging live performers on both sides of the Atlantic.",
    ],
  },
  {
    slug: "watch-the-anthem-for-the-africa-cup-of-nations-2015",
    title: "Watch the Anthem for the Africa Cup of Nations 2015",
    excerpt:
      "Revisit the official 2015 Africa Cup of Nations anthem featuring Wizboyy alongside Cano, Molare, Manni Bella, Toofan, Eddy Kenzo, Singuila, and Arielle T.",
    date: "March 16, 2022",
    isoDate: "2022-03-16T14:35:03+00:00",
    category: "Music & Milestones",
    author: "Wiz Ofuasia Editorial",
    readTime: "3 min read",
    coverImage: "/images/gallery/wizolingo3.jpg",
    tags: ["AFCON 2015", "Anthem", "Toofan", "Eddy Kenzo", "Collaboration"],
    contentParagraphs: [
      "Few moments unite the African continent quite like the Africa Cup of Nations (AFCON), and in 2015 Wiz Ofuasia (Wizboyy) was tapped to help soundtrack that continental celebration as part of the official AFCON 2015 anthem.",
      "Bringing together powerhouse voices across West, Central, and East Africa, the anthem featured Wizboyy alongside Cano, Molare, Manni Bella, Toofan, Eddy Kenzo, Singuila, and Arielle T — blending Francophone and Anglophone musical traditions into one soaring stadium chorus.",
      "Each artist contributed their distinct regional cadence and vocal texture while locking into an uplifting celebratory groove designed for packed football stadiums, fan zones, and television broadcasts across the globe.",
      "For Wiz Ofuasia, representing Nigerian Highlife and Afrobeats on a pan-African project of this scale underscored the universal language of African rhythm: music capable of bridging borders, languages, and generations in a single chorus.",
    ],
  },
  {
    slug: "wiz-ofuasia-zero-corona-unesco",
    title: "Wiz Ofuasia — Zero Corona — UNESCO #DontGoViral",
    excerpt:
      "Wiz Ofuasia joined African artists in UNESCO's #DontGoViral 'Zero Corona' campaign in partnership with i4Policy and the African Union of Broadcasting.",
    date: "March 16, 2022",
    isoDate: "2022-03-16T03:30:02+00:00",
    category: "Global Impact",
    author: "Wiz Ofuasia Editorial",
    readTime: "3 min read",
    coverImage: "/images/gallery/wizolingo6.jpg",
    tags: ["UNESCO", "Zero Corona", "DontGoViral", "Africa Day"],
    contentParagraphs: [
      "When global communities faced unprecedented uncertainty during the pandemic, music became an essential vehicle for trusted public health communication. Wiz Ofuasia joined Collective Africa Zero Corona for 'Zero Corona', a standout release under UNESCO's #DontGoViral campaign.",
      "Launched by UNESCO in partnership with the Innovation for Policy Foundation (i4Policy), the #DontGoViral initiative mobilized influential musicians, poets, and visual storytellers across Africa to share culturally resonant, accurate health awareness messages with millions of listeners.",
      "Featured as part of UNESCO's Celebration of Africa Day and the Worldwide Afro Network's day-long broadcast — held under the patronage of UNESCO in partnership with the African Union of Broadcasting — 'Zero Corona' demonstrated how artists can use their platforms for meaningful civic impact.",
      "For Wiz Ofuasia, participating in the campaign reflected a core belief that has guided his entire career: great music doesn't just entertain; it educates, uplifts, and stands with communities when it matters most.",
    ],
  },
];

async function seedBlogs() {
  const mongoUri =
    process.env.MONGO_URL ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL;
  if (!mongoUri) {
    console.error("No MONGO_URL or MONGO_URI found in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully.");

    let seededCount = 0;
    let updatedCount = 0;

    for (const post of STATIC_BLOG_POSTS) {
      const richTextContent = post.contentParagraphs
        .map((p) => `<p>${p}</p>`)
        .join("\n");

      const existing = await Blog.findOne({ slug: post.slug });

      const blogDoc = {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: richTextContent,
        category: post.category,
        author: post.author,
        readTime: post.readTime,
        coverImage: post.coverImage,
        tags: post.tags,
        status: "Published",
        isPublished: true,
        date: post.date,
        isoDate: post.isoDate,
      };

      if (!existing) {
        await new Blog(blogDoc).save();
        console.log(`✅ Seeded: "${post.title}" (${post.slug})`);
        seededCount++;
      } else {
        // If it exists, update it while preserving any admin edits if desirable, or update missing fields
        console.log(`ℹ️ Already exists: "${post.title}" (${post.slug})`);
        updatedCount++;
      }
    }

    console.log(
      `\nDone! Seeded ${seededCount} new blogs, ${updatedCount} already in database.`
    );
  } catch (err) {
    console.error("Error during blog seeding:", err);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
}

if (require.main === module) {
  seedBlogs();
}

module.exports = { seedBlogs, STATIC_BLOG_POSTS };
