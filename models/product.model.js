const productDatabase = require('../schema/product.schema');
const reviewDatabse = require('../schema/review.schema');
const cloudinary = require('../config/cloudinary');
const slugify = require('slugify');

async function  fetchAllProducts(page, limit, sortBy) {
  try {
    try {
      if (sortBy) {
        let sortOptions = {};

        switch (sortBy) {
          case 'featured':
            break;
          case 'lowToHigh':
            sortOptions = { productPrice: 1 }; // Sort by price: low to high
            break;
          case 'highToLow':
            sortOptions = { productPrice: -1 }; // Sort by price: high to low
            break;
          case 'releaseDate':
            sortOptions = { createdAt: -1 }; // Sort by release date (descending)
            break;
          default:
            break;
        }

        var products = await productDatabase
          .find({ productStatus: true })
          .populate('productCategory')
          .sort(sortOptions)
          .skip((page - 1) * limit)
          .limit(limit);
      } else {
        var products = await productDatabase
          .find({ productStatus: true })
          .populate('productCategory')
          .skip((page - 1) * limit)
          .limit(limit);
      }

      const totalProducts = await productDatabase.countDocuments();
      const totalPages = Math.ceil(totalProducts / limit);

      return {
        status: true,
        products: products,
        totalPages: totalPages,
        currentPage: page,
        limit: limit,
        productCount: totalProducts,
      };
    } catch (error) {
      console.log(error);
      return { status: false, message: error.message };
    }
  } catch (error) {
    throw new Error(`Error finding products: ${error.message}`);
  }
}

async function fetchProduct(slug) {
  try {
    const product = await productDatabase.findOne({ slug: slug }).populate('productCategory');
    if (!product.productStatus) {
      return { status: false };
    } else {
      return { status: true, product };
    }
  } catch (error) {
    throw new Error(`Error fetching product: ${error.message}`);
  }
}

async function addNewProduct(dataBody, dataFiles) {
  const {
    productName,
    productDescription,
    productPrice,
    productOldPrice,
    stocks,
    productCategory,
  } = dataBody;

  const existingProduct = await productDatabase.findOne({ productName: productName });
  if (existingProduct) {
    return ({ status: false, message: "A product with the same name already exists." })
  }

  const product = new productDatabase({
    productName: productName,
    productDescription: productDescription,
    productPrice: productPrice,
    productOldPrice: productOldPrice,
    stocks: stocks,
    productCategory: productCategory,
    deleteStatus: false,
  });
  product.slug = slugify(productName, { lower: true });

  try {
    const imageUrlList = [];
    for (let i = 0; i < dataFiles.length; i++) {
      let locaFilePath = dataFiles[i].path;
      let response = await cloudinary.uploader.upload(locaFilePath, {
        folder: 'eartunes/product_images',
        unique_filename: true,
      });
      imageUrlList.push(response.url);
    }

    product.productImageUrls = imageUrlList;
    const result = await product.save();
    if (result) {
      return { status: true };
    } else {
      return { status: false };
    }
  } catch (error) {
    throw new Error(`Error adding products: ${error.message}`);
  }
}

async function updateProductStatus(productId) {
  try {
    const product = await productDatabase.findByIdAndUpdate(
      { _id: productId },
      { $set: { productStatus: false } },
    );
    if (product) {
      return { status: true, product };
    } else {
      return { status: false };
    }
  } catch (error) {
    throw new Error(`Error updating product: ${error.message}`);
  }
}

async function getProductImages(productId) {
  try {
    const product = await productDatabase.findById(productId).select('productImageUrls');
    return product;
  } catch (error) {
    throw new Error(`Error fetchig product images: ${error.message}`);
  }
}

async function updateProduct(productId, productData, productImages) {
  try {
    const product = await productDatabase.findById(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    if (
      productImages &&
      product.productImageUrls.length < 4 &&
      product.productImageUrls.length + productImages.length < 4
    ) {
      for (let i = 0; i < productImages.length; i++) {
        let locaFilePath = productImages[i].path;
        let response = await cloudinary.uploader.upload(locaFilePath, {
          folder: 'eartunes/product_images',
          unique_filename: true,
        });
        product.productImageUrls.push(response.url);
      }
    }

    product.productName = productData.productName || product.productName;
    product.productDescription = productData.productDescription || product.productDescription;
    product.productPrice = productData.productPrice || product.productPrice;
    product.productOldPrice = productData.productOldPrice || product.productOldPrice;
    product.stocks = productData.stocks || product.stocks;
    product.productCategory = productData.productCategory || product.productCategory;

    const updatedProduct = await product.save();

    return { status: true, updatedProduct: updatedProduct, message: "Product updated successfully" };
  } catch (error) {
    throw new Error(`Error updating product details: ${error.message}`);
  }
}

async function getProductsWithCategory(categoryId, page, limit, sortBy) {
  try {
    if (sortBy) {
      let sortOptions = {};

      switch (sortBy) {
        case 'featured':
          break;
        case 'lowToHigh':
          sortOptions = { productPrice: 1 }; // Sort by price: low to high
          break;
        case 'highToLow':
          sortOptions = { productPrice: -1 }; // Sort by price: high to low
          break;
        case 'releaseDate':
          sortOptions = { createdAt: -1 }; // Sort by release date (descending)
          break;
        default:
          break;
      }
      var products = await productDatabase
        .find({ productCategory: categoryId })
        .sort(sortOptions) // Apply the sorting options
        .skip((page - 1) * limit)
        .limit(limit);
    } else {
      var products = await productDatabase
        .find({ productCategory: categoryId })
        .skip((page - 1) * limit)
        .limit(limit);
    }

    const totalProducts = products.length;
    const totalPages = Math.ceil(totalProducts / limit);

    return {
      products: products,
      totalPages: totalPages,
      currentPage: page,
      limit: limit,
      productCount: totalProducts,
    };
  } catch (error) {
    throw new Error(`Error searching products with category: ${error.message}`);
  }
}

async function searchProductsWithRegex(searchRegex) {
  try {
    const products = await productDatabase.find({ productName: searchRegex });
    return products;
  } catch (error) {
    throw new Error(`Error while searching products`);
  }
}
async function addReview(userId, reviewText, rating, productResult) {
  try {
    const newReview = new reviewDatabse({
      reviewer: userId,
      reviewText: reviewText,
      rating: rating,
      product: productResult.product._id,
    });
    let savedReview = await newReview.save();
    if (savedReview) {
      productResult.product.productReview.push(savedReview._id);
      await productResult.product.save();
      return { status: true };
    } else {
      return { status: false };
    }
  } catch (error) {
    console.error('Error adding review:', error);
  }
}

async function calculateProductAverageRating(productId) {
  try {
    const product = await productDatabase.findById(productId).populate('productReview');
    if (!product || !product.productReview || product.productReview.length === 0) {
      return 0; 
    }
    const totalRating = product.productReview.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / product.productReview.length;
    const productRating = Math.min(Math.max(averageRating, 1), 5);
    return productRating;
  } catch (error) {
    throw new Error(`Error calculating average rating: ${error.message}`);
  }
}

async function getProductStocks() {
  try {
    const productStock = await productDatabase.find({}).populate('productCategory').exec();
    const stockData = [];

    for (const product of productStock) {
      const { productName, productCategory, productPrice, stocks } = product;
      const productDetails = {
        productName,
        productCategory: productCategory ? productCategory.name : 'Unknown Category',
        productPrice,
        stocks,
      };
      stockData.push(productDetails);
    }
    return stockData;
  } catch (error) {
    throw new Error('Fetching product was failed!');
  }
}

module.exports = {
  fetchAllProducts,
  fetchProduct,
  addNewProduct,
  updateProductStatus,
  getProductImages,
  updateProduct,
  getProductsWithCategory,
  searchProductsWithRegex,
  addReview,
  calculateProductAverageRating,
  getProductStocks,
};
