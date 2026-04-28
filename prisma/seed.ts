import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean up
  await prisma.cartItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.rentalListing.deleteMany();
  await prisma.propertyManager.deleteMany();
  await prisma.catalogItem.deleteMany();
  await prisma.mealOption.deleteMany();

  // Property Managers
  const managers = await Promise.all([
    prisma.propertyManager.create({ data: { name: 'Alice Johnson', email: 'alice@realty.com', phone: '305-555-0101', responseSla: 2, rating: 4.9, serviceAreas: ['Miami', 'Fort Lauderdale'], bio: 'Luxury rentals specialist with 10+ years experience.' } }),
    prisma.propertyManager.create({ data: { name: 'Bob Martinez', email: 'bob@sunrentals.com', phone: '305-555-0102', responseSla: 4, rating: 4.7, serviceAreas: ['Miami'], bio: 'Family-friendly vacation homes.' } }),
    prisma.propertyManager.create({ data: { name: 'Carol Smith', email: 'carol@austinstays.com', phone: '512-555-0201', responseSla: 2, rating: 4.8, serviceAreas: ['Austin'], bio: 'Music city stays near downtown.' } }),
    prisma.propertyManager.create({ data: { name: 'David Lee', email: 'david@texasrentals.com', phone: '512-555-0202', responseSla: 6, rating: 4.5, serviceAreas: ['Austin', 'San Antonio'], bio: 'Modern lofts and cozy cottages.' } }),
    prisma.propertyManager.create({ data: { name: 'Emma Wilson', email: 'emma@milehigh.com', phone: '720-555-0301', responseSla: 3, rating: 4.9, serviceAreas: ['Denver'], bio: 'Mountain gateway properties.' } }),
    prisma.propertyManager.create({ data: { name: 'Frank Brown', email: 'frank@rockymtn.com', phone: '720-555-0302', responseSla: 8, rating: 4.3, serviceAreas: ['Denver', 'Boulder'], bio: 'Ski-in/ski-out specialists.' } }),
    prisma.propertyManager.create({ data: { name: 'Grace Chen', email: 'grace@miamivillas.com', phone: '305-555-0103', responseSla: 1, rating: 5.0, serviceAreas: ['Miami'], bio: 'Ultra-luxury villa management.' } }),
    prisma.propertyManager.create({ data: { name: 'Henry Davis', email: 'henry@austinbeds.com', phone: '512-555-0203', responseSla: 12, rating: 4.2, serviceAreas: ['Austin'], bio: 'Budget-friendly options.' } }),
    prisma.propertyManager.create({ data: { name: 'Iris Nguyen', email: 'iris@denverhomes.com', phone: '720-555-0303', responseSla: 4, rating: 4.6, serviceAreas: ['Denver'], bio: 'Urban condos and penthouses.' } }),
    prisma.propertyManager.create({ data: { name: 'Jack Taylor', email: 'jack@premiumstays.com', phone: '800-555-0001', responseSla: 2, rating: 4.8, serviceAreas: ['Miami', 'Austin', 'Denver'], bio: 'Nationwide premium rentals network.' } }),
  ]);

  // Miami listings
  const miamiListings = [
    { managerId: managers[0].id, title: 'Beachfront Paradise', description: 'Stunning ocean views, steps from the beach', address: '100 Ocean Dr', city: 'Miami', lat: 25.7759, lng: -80.1300, nightlyPrice: 350, cleaningFee: 75, serviceFee: 50, maxGuests: 6, amenities: ['Pool', 'WiFi', 'Beach Access', 'AC', 'Parking'], images: ['https://picsum.photos/seed/miami1/800/600'] },
    { managerId: managers[1].id, title: 'South Beach Studio', description: 'Trendy studio in the heart of South Beach', address: '200 Collins Ave', city: 'Miami', lat: 25.7825, lng: -80.1306, nightlyPrice: 150, cleaningFee: 40, serviceFee: 25, maxGuests: 2, amenities: ['WiFi', 'AC', 'Gym'], images: ['https://picsum.photos/seed/miami2/800/600'] },
    { managerId: managers[6].id, title: 'Luxury Brickell Penthouse', description: 'Panoramic city and bay views from the 40th floor', address: '1000 Brickell Ave', city: 'Miami', lat: 25.7617, lng: -80.1918, nightlyPrice: 600, cleaningFee: 150, serviceFee: 100, maxGuests: 8, amenities: ['Rooftop Pool', 'WiFi', 'Concierge', 'Valet', 'AC'], images: ['https://picsum.photos/seed/miami3/800/600'] },
    { managerId: managers[0].id, title: 'Wynwood Art District Loft', description: 'Artsy loft surrounded by murals and galleries', address: '250 NW 23rd St', city: 'Miami', lat: 25.7989, lng: -80.1997, nightlyPrice: 225, cleaningFee: 60, serviceFee: 35, maxGuests: 4, amenities: ['WiFi', 'AC', 'Rooftop'], images: ['https://picsum.photos/seed/miami4/800/600'] },
    { managerId: managers[9].id, title: 'Coconut Grove Villa', description: 'Lush tropical garden villa with private pool', address: '3100 Main Hwy', city: 'Miami', lat: 25.7271, lng: -80.2380, nightlyPrice: 450, cleaningFee: 100, serviceFee: 75, maxGuests: 10, amenities: ['Private Pool', 'Garden', 'WiFi', 'BBQ', 'AC'], images: ['https://picsum.photos/seed/miami5/800/600'] },
    { managerId: managers[1].id, title: 'Coral Gables Retreat', description: 'Mediterranean-style home in an upscale neighborhood', address: '800 Alhambra Pl', city: 'Miami', lat: 25.7486, lng: -80.2584, nightlyPrice: 320, cleaningFee: 80, serviceFee: 50, maxGuests: 6, amenities: ['Pool', 'WiFi', 'AC', 'Parking', 'Garden'], images: ['https://picsum.photos/seed/miami6/800/600'] },
    { managerId: managers[6].id, title: 'Miami Beach Cabana', description: 'Colorful Art Deco cabana with beach chairs', address: '1435 Washington Ave', city: 'Miami', lat: 25.7903, lng: -80.1314, nightlyPrice: 180, cleaningFee: 45, serviceFee: 30, maxGuests: 4, amenities: ['Beach Access', 'WiFi', 'AC'], images: ['https://picsum.photos/seed/miami7/800/600'] },
    { managerId: managers[9].id, title: 'Design District Modern Flat', description: 'Sleek modern apartment near top restaurants', address: '140 NE 39th St', city: 'Miami', lat: 25.8148, lng: -80.1907, nightlyPrice: 275, cleaningFee: 65, serviceFee: 40, maxGuests: 4, amenities: ['WiFi', 'AC', 'Gym', 'Concierge'], images: ['https://picsum.photos/seed/miami8/800/600'] },
    { managerId: managers[1].id, title: 'Little Havana Casita', description: 'Charming cottage with authentic Cuban flavor', address: '1001 SW 8th St', city: 'Miami', lat: 25.7681, lng: -80.2295, nightlyPrice: 120, cleaningFee: 35, serviceFee: 20, maxGuests: 3, amenities: ['WiFi', 'AC', 'Patio'], images: ['https://picsum.photos/seed/miami9/800/600'] },
    { managerId: managers[0].id, title: 'Key Biscayne Waterfront', description: 'Private dock, kayaks, and stunning sunsets', address: '1 Harbor Dr', city: 'Miami', lat: 25.6930, lng: -80.1634, nightlyPrice: 520, cleaningFee: 120, serviceFee: 80, maxGuests: 8, amenities: ['Private Dock', 'Kayaks', 'Pool', 'WiFi', 'AC'], images: ['https://picsum.photos/seed/miami10/800/600'] },
  ];

  // Austin listings
  const austinListings = [
    { managerId: managers[2].id, title: 'Downtown Austin Loft', description: 'Modern loft steps from 6th Street entertainment', address: '600 W 6th St', city: 'Austin', lat: 30.2724, lng: -97.7503, nightlyPrice: 250, cleaningFee: 60, serviceFee: 40, maxGuests: 4, amenities: ['WiFi', 'AC', 'Rooftop Bar Access'], images: ['https://picsum.photos/seed/austin1/800/600'] },
    { managerId: managers[3].id, title: 'East Austin Bungalow', description: 'Hip bungalow in the trendiest neighborhood', address: '1200 E Cesar Chavez', city: 'Austin', lat: 30.2582, lng: -97.7253, nightlyPrice: 175, cleaningFee: 45, serviceFee: 30, maxGuests: 4, amenities: ['WiFi', 'AC', 'Backyard', 'Fire Pit'], images: ['https://picsum.photos/seed/austin2/800/600'] },
    { managerId: managers[7].id, title: 'South Congress Budget Room', description: 'Affordable private room near SoCo shops', address: '1500 S Congress Ave', city: 'Austin', lat: 30.2456, lng: -97.7489, nightlyPrice: 90, cleaningFee: 25, serviceFee: 15, maxGuests: 2, amenities: ['WiFi', 'AC', 'Parking'], images: ['https://picsum.photos/seed/austin3/800/600'] },
    { managerId: managers[2].id, title: 'Lake Austin Waterfront', description: 'Stunning lake home with private boat dock', address: '4000 Lake Austin Blvd', city: 'Austin', lat: 30.3072, lng: -97.8056, nightlyPrice: 480, cleaningFee: 110, serviceFee: 75, maxGuests: 10, amenities: ['Lake Access', 'Boat Dock', 'Pool', 'WiFi', 'BBQ'], images: ['https://picsum.photos/seed/austin4/800/600'] },
    { managerId: managers[9].id, title: 'Zilker Park Cottage', description: 'Cozy cottage walking distance to Barton Springs', address: '2100 Barton Springs Rd', city: 'Austin', lat: 30.2613, lng: -97.7707, nightlyPrice: 210, cleaningFee: 55, serviceFee: 35, maxGuests: 5, amenities: ['WiFi', 'AC', 'Patio', 'Parking'], images: ['https://picsum.photos/seed/austin5/800/600'] },
    { managerId: managers[3].id, title: 'Mueller District Home', description: 'New construction in walkable Mueller neighborhood', address: '1800 Simond Ave', city: 'Austin', lat: 30.2968, lng: -97.7039, nightlyPrice: 290, cleaningFee: 70, serviceFee: 45, maxGuests: 6, amenities: ['WiFi', 'AC', 'Garage', 'Yard'], images: ['https://picsum.photos/seed/austin6/800/600'] },
    { managerId: managers[7].id, title: 'UT Campus Studio', description: 'Walk to campus, perfect for visitors', address: '2500 Nueces St', city: 'Austin', lat: 30.2872, lng: -97.7464, nightlyPrice: 110, cleaningFee: 30, serviceFee: 18, maxGuests: 2, amenities: ['WiFi', 'AC', 'Bike Storage'], images: ['https://picsum.photos/seed/austin7/800/600'] },
    { managerId: managers[2].id, title: 'Domain Upscale Apartment', description: 'Luxury apartment in the Domain tech district', address: '11900 Domain Blvd', city: 'Austin', lat: 30.4016, lng: -97.7241, nightlyPrice: 200, cleaningFee: 50, serviceFee: 32, maxGuests: 3, amenities: ['Pool', 'Gym', 'WiFi', 'AC', 'Parking'], images: ['https://picsum.photos/seed/austin8/800/600'] },
    { managerId: managers[9].id, title: 'Travis Heights Craftsman', description: 'Beautiful craftsman home in historic neighborhood', address: '1501 Newning Ave', city: 'Austin', lat: 30.2458, lng: -97.7372, nightlyPrice: 335, cleaningFee: 85, serviceFee: 55, maxGuests: 7, amenities: ['WiFi', 'AC', 'Hot Tub', 'Garden'], images: ['https://picsum.photos/seed/austin9/800/600'] },
    { managerId: managers[3].id, title: 'Hyde Park Victorian', description: 'Restored Victorian in tree-lined Hyde Park', address: '4001 Ave H', city: 'Austin', lat: 30.3072, lng: -97.7356, nightlyPrice: 260, cleaningFee: 65, serviceFee: 42, maxGuests: 5, amenities: ['WiFi', 'AC', 'Porch', 'Parking'], images: ['https://picsum.photos/seed/austin10/800/600'] },
  ];

  // Denver listings
  const denverListings = [
    { managerId: managers[4].id, title: 'LoDo Historic Warehouse', description: 'Converted warehouse loft in historic lower downtown', address: '1700 Platte St', city: 'Denver', lat: 39.7534, lng: -105.0078, nightlyPrice: 220, cleaningFee: 55, serviceFee: 35, maxGuests: 4, amenities: ['WiFi', 'AC', 'Parking', 'Bike Share'], images: ['https://picsum.photos/seed/denver1/800/600'] },
    { managerId: managers[5].id, title: 'Capitol Hill Victorian', description: 'Elegant Victorian near the Colorado Capitol', address: '1200 E Colfax Ave', city: 'Denver', lat: 39.7418, lng: -104.9727, nightlyPrice: 195, cleaningFee: 50, serviceFee: 30, maxGuests: 5, amenities: ['WiFi', 'Parking', 'Garden', 'Porch'], images: ['https://picsum.photos/seed/denver2/800/600'] },
    { managerId: managers[8].id, title: 'RiNo Art District Flat', description: 'Stylish flat in the River North art scene', address: '3500 Brighton Blvd', city: 'Denver', lat: 39.7691, lng: -104.9721, nightlyPrice: 185, cleaningFee: 45, serviceFee: 28, maxGuests: 3, amenities: ['WiFi', 'AC', 'Rooftop'], images: ['https://picsum.photos/seed/denver3/800/600'] },
    { managerId: managers[4].id, title: 'Cherry Creek Luxury Condo', description: 'Upscale condo near world-class shopping and dining', address: '300 Fillmore St', city: 'Denver', lat: 39.7157, lng: -104.9593, nightlyPrice: 380, cleaningFee: 90, serviceFee: 60, maxGuests: 6, amenities: ['Pool', 'Gym', 'WiFi', 'Valet', 'AC'], images: ['https://picsum.photos/seed/denver4/800/600'] },
    { managerId: managers[9].id, title: 'Washington Park Bungalow', description: 'Charming bungalow blocks from Washington Park', address: '500 S Humboldt St', city: 'Denver', lat: 39.7058, lng: -104.9680, nightlyPrice: 240, cleaningFee: 60, serviceFee: 38, maxGuests: 5, amenities: ['WiFi', 'Backyard', 'BBQ', 'Parking'], images: ['https://picsum.photos/seed/denver5/800/600'] },
    { managerId: managers[5].id, title: 'Ski Gateway Retreat', description: 'Perfect base for day trips to the slopes', address: '8000 W Alameda Ave', city: 'Denver', lat: 39.7131, lng: -105.0778, nightlyPrice: 310, cleaningFee: 75, serviceFee: 50, maxGuests: 8, amenities: ['Hot Tub', 'Ski Storage', 'WiFi', 'Fireplace'], images: ['https://picsum.photos/seed/denver6/800/600'] },
    { managerId: managers[8].id, title: 'Highland Neighborhood Home', description: 'Family-friendly home in the charming Highlands', address: '3300 Zuni St', city: 'Denver', lat: 39.7658, lng: -105.0168, nightlyPrice: 270, cleaningFee: 70, serviceFee: 44, maxGuests: 6, amenities: ['WiFi', 'Backyard', 'Parking', 'AC'], images: ['https://picsum.photos/seed/denver7/800/600'] },
    { managerId: managers[4].id, title: 'Five Points Jazz District', description: 'Walk to jazz venues and top restaurants', address: '2600 Welton St', city: 'Denver', lat: 39.7544, lng: -104.9799, nightlyPrice: 165, cleaningFee: 40, serviceFee: 25, maxGuests: 3, amenities: ['WiFi', 'AC', 'Shared Patio'], images: ['https://picsum.photos/seed/denver8/800/600'] },
    { managerId: managers[9].id, title: 'Baker District Craftsman', description: 'Restored craftsman in trendy Baker neighborhood', address: '400 W Bayaud Ave', city: 'Denver', lat: 39.7221, lng: -104.9914, nightlyPrice: 230, cleaningFee: 58, serviceFee: 36, maxGuests: 4, amenities: ['WiFi', 'Yard', 'Porch', 'Parking'], images: ['https://picsum.photos/seed/denver9/800/600'] },
    { managerId: managers[5].id, title: 'Uptown Denver Penthouse', description: 'Panoramic mountain views from rooftop terrace', address: '1900 E 17th Ave', city: 'Denver', lat: 39.7478, lng: -104.9724, nightlyPrice: 425, cleaningFee: 100, serviceFee: 70, maxGuests: 6, amenities: ['Rooftop Terrace', 'WiFi', 'AC', 'Gym', 'Concierge'], images: ['https://picsum.photos/seed/denver10/800/600'] },
  ];

  const allListingData = [...miamiListings, ...austinListings, ...denverListings];
  const listings = await Promise.all(
    allListingData.map(l => prisma.rentalListing.create({
      data: {
        ...l,
        amenities: JSON.stringify(l.amenities),
        images: JSON.stringify(l.images),
      }
    }))
  );

  // Create availability blocks for next 60 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const listing of listings) {
    const bookedPct = Math.random() * 0.4;

    for (let i = 0; i < 60; i++) {
      const start = new Date(today);
      start.setDate(today.getDate() + i);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);

      const isBooked = Math.random() < bookedPct;

      await prisma.availabilityBlock.create({
        data: {
          listingId: listing.id,
          startDate: start,
          endDate: end,
          isAvailable: !isBooked,
        }
      });
    }
  }

  // Catalog Items
  await Promise.all([
    // Toiletries
    prisma.catalogItem.create({ data: { category: 'toiletries', name: 'Premium Toiletry Kit', description: 'Shampoo, conditioner, body wash, lotion', price: 18.99, stockQty: 200 } }),
    prisma.catalogItem.create({ data: { category: 'toiletries', name: 'Spa Towel Set', description: 'Set of 4 luxury bath towels', price: 24.99, stockQty: 150 } }),
    prisma.catalogItem.create({ data: { category: 'toiletries', name: 'Beach Kit', description: 'Sunscreen SPF 50, aloe vera, beach towel', price: 29.99, stockQty: 100 } }),
    prisma.catalogItem.create({ data: { category: 'toiletries', name: 'Baby Essentials Kit', description: 'Baby shampoo, lotion, wipes - travel sized', price: 21.99, stockQty: 80 } }),
    prisma.catalogItem.create({ data: { category: 'toiletries', name: 'Dental Care Bundle', description: 'Toothbrushes x4, toothpaste, mouthwash', price: 14.99, stockQty: 300 } }),
    // Food
    prisma.catalogItem.create({ data: { category: 'food', name: 'Welcome Snack Basket', description: 'Assorted chips, cookies, nuts and drinks', price: 34.99, stockQty: 60 } }),
    prisma.catalogItem.create({ data: { category: 'food', name: 'Wine & Cheese Board', description: 'Curated wine bottle + artisan cheese selection', price: 59.99, stockQty: 40 } }),
    prisma.catalogItem.create({ data: { category: 'food', name: 'Coffee & Tea Starter', description: 'Premium coffee pods, assorted teas, sugar', price: 19.99, stockQty: 120 } }),
    prisma.catalogItem.create({ data: { category: 'food', name: 'Fruit & Granola Box', description: 'Fresh seasonal fruits, granola, yogurt cups', price: 28.99, stockQty: 50 } }),
    prisma.catalogItem.create({ data: { category: 'food', name: 'BBQ Starter Pack', description: 'Meats, marinades, charcoal, utensils', price: 49.99, stockQty: 35 } }),
    // Equipment
    prisma.catalogItem.create({ data: { category: 'equipment', name: 'Beach Cruiser Bike', description: '7-speed cruiser bike with helmet', price: 35.00, stockQty: 30 } }),
    prisma.catalogItem.create({ data: { category: 'equipment', name: 'Kayak Rental', description: 'Single kayak with paddle and life vest', price: 55.00, stockQty: 15 } }),
    prisma.catalogItem.create({ data: { category: 'equipment', name: 'Stand-Up Paddleboard', description: 'SUP board, paddle, ankle leash', price: 65.00, stockQty: 12 } }),
    prisma.catalogItem.create({ data: { category: 'equipment', name: 'Camping Gear Set', description: 'Tent (4-person), sleeping bags, lantern', price: 79.00, stockQty: 20 } }),
    prisma.catalogItem.create({ data: { category: 'equipment', name: 'Ski Package', description: 'Skis, boots, poles - per day', price: 85.00, stockQty: 25 } }),
    prisma.catalogItem.create({ data: { category: 'equipment', name: 'Golf Club Set', description: 'Full set with bag and cart rental', price: 45.00, stockQty: 18 } }),
  ]);

  // Meal Options
  await Promise.all([
    prisma.mealOption.create({ data: { type: 'breakfast', name: 'Continental Sunrise', description: 'Fresh pastries, fruit, OJ, coffee for 2', price: 38.00, items: JSON.stringify(['Croissants x4', 'Fruit plate', 'Orange juice x2', 'Coffee/tea']) } }),
    prisma.mealOption.create({ data: { type: 'breakfast', name: 'Full American Breakfast', description: 'Eggs, bacon, toast, hash browns for 4', price: 68.00, items: JSON.stringify(['Scrambled eggs', 'Bacon strips', 'Toast', 'Hash browns', 'Coffee', 'Orange juice']) } }),
    prisma.mealOption.create({ data: { type: 'breakfast', name: 'Healthy Start', description: 'Smoothie bowls, avocado toast, green juice for 2', price: 52.00, items: JSON.stringify(['Smoothie bowls x2', 'Avocado toast x2', 'Green juice x2']) } }),
    prisma.mealOption.create({ data: { type: 'dinner', name: 'BBQ Night', description: 'Grilled meats, corn, coleslaw for 4', price: 95.00, items: JSON.stringify(['Ribeye steak x2', 'BBQ chicken x2', 'Corn on cob x4', 'Coleslaw', 'Dinner rolls']) } }),
    prisma.mealOption.create({ data: { type: 'dinner', name: 'Seafood Feast', description: 'Fresh catch of the day, grilled veggies for 2', price: 85.00, items: JSON.stringify(['Lobster tail x2', 'Grilled salmon', 'Seasonal vegetables', 'Rice pilaf', 'White wine']) } }),
    prisma.mealOption.create({ data: { type: 'dinner', name: 'Italian Dinner Night', description: 'Pasta, salad, garlic bread, wine for 4', price: 72.00, items: JSON.stringify(['Pasta carbonara', 'Caesar salad', 'Garlic bread', 'Tiramisu', 'Red wine bottle']) } }),
  ]);

  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
