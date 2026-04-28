import os
import zipfile
try:
    import kaggle
except OSError as e:
    print("Warning: Kaggle credentials not found. Please place your kaggle.json in ~/.kaggle/")

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

def download_amazon_delivery_dataset(dataset_id="rohanrao/amazon-delivery-dataset", download_path=DATA_DIR):
    """
    Downloads the specified dataset from Kaggle using the kaggle python package.
    Requires kaggle.json API token to be configured.
    """
    if not os.path.exists(download_path):
        os.makedirs(download_path)

    print(f"Attempting to download dataset {dataset_id} from Kaggle...")
    try:
        kaggle.api.dataset_download_files(dataset_id, path=download_path, unzip=False)
        
        # Unzip the file
        zip_filename = dataset_id.split('/')[-1] + '.zip'
        zip_filepath = os.path.join(download_path, zip_filename)
        
        if os.path.exists(zip_filepath):
            with zipfile.ZipFile(zip_filepath, 'r') as zip_ref:
                zip_ref.extractall(download_path)
            print(f"Successfully downloaded and extracted to {download_path}")
            # Optionally remove zip file
            os.remove(zip_filepath)
        else:
            print("Download completed but zip file not found. It may have been unzipped automatically.")
            
    except Exception as e:
        print(f"Error downloading dataset: {e}")
        print("Please ensure your kaggle.json is correctly configured.")

if __name__ == "__main__":
    download_amazon_delivery_dataset()
