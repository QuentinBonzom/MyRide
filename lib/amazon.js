import AmazonPaapi from 'amazon-pa-api50';

const amazon = new AmazonPaapi({
  accessKey: process.env.AMAZON_ACCESS_KEY_ID,
  secretKey: process.env.AMAZON_SECRET_ACCESS_KEY,
  partnerTag: process.env.AMAZON_PARTNER_TAG,
  host: 'webservices.amazon.com',
  region: process.env.AMAZON_REGION,
});

export async function searchAmazonProducts(keywords) {
  try {
    console.log("Amazon keys check:", {
        accessKey: process.env.AMAZON_ACCESS_KEY_ID,
        partnerTag: process.env.AMAZON_PARTNER_TAG,
        region: process.env.AMAZON_REGION,
        });

    const response = await amazon.searchItems({
      Keywords: keywords,
      Resources: [
        "Images.Primary.Medium",
        "ItemInfo.Title",
        "Offers.Listings.Price"
      ]
    });

    const item = response.SearchResult?.Items?.[0];
    if (!item) return null;

    return {
      title: item.ItemInfo?.Title?.DisplayValue,
      url: item.DetailPageURL,
      image: item.Images?.Primary?.Medium?.URL,
      price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount,
    };
  } catch (error) {
    console.error("Amazon search error:", error);
    return null;
  }
}
