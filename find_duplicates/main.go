package main

import (
	"crypto/sha256"
	"encoding/hex"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type FileInfo struct {
	Path string
	Size int64
	Hash string
}

func computeHash(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := sha256.New()
	buf := make([]byte, 8192)
	for {
		n, err := f.Read(buf)
		if n > 0 {
			h.Write(buf[:n])
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func scanDir(root string, minSize int64, jobs chan<- string, _ *sync.WaitGroup) {
	filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		if info.Size() >= minSize {
			jobs <- path
		}
		return nil
	})
}

func worker(id int, jobs <-chan string, results chan<- FileInfo, wg *sync.WaitGroup) {
	defer wg.Done()
	for path := range jobs {
		hash, err := computeHash(path)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Worker %d: %s: %v\n", id, path, err)
			continue
		}
		info, _ := os.Stat(path)
		results <- FileInfo{Path: path, Size: info.Size(), Hash: hash}
	}
}

func formatSize(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %ciB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func main() {
	root := flag.String("dir", ".", "Directory to scan")
	minSizeMB := flag.Int64("min-size", 1, "Minimum file size in MB")
	workers := flag.Int("workers", 4, "Number of worker goroutines")
	deleteFlag := flag.Bool("delete", false, "Delete duplicates (keep first)")
	dryRun := flag.Bool("dry-run", true, "Show what would be deleted without deleting")
	flag.Parse()

	minSize := int64(*minSizeMB) * 1024 * 1024

	fmt.Printf("Scanning %s (min size: %d MB, workers: %d)...\n", *root, *minSizeMB, *workers)
	start := time.Now()

	jobs := make(chan string, 1000)
	results := make(chan FileInfo, 1000)

	var wg sync.WaitGroup

	// Start scanner - runs in its own goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		scanDir(*root, minSize, jobs, &sync.WaitGroup{}) // use dummy wg
		close(jobs) // close jobs when scanning done
	}()

	// Start workers
	for i := 1; i <= *workers; i++ {
		wg.Add(1)
		go worker(i, jobs, results, &wg)
	}

	// Close results when all workers done
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	fileMap := make(map[string][]FileInfo)
	count := 0
	for info := range results {
		fileMap[info.Hash] = append(fileMap[info.Hash], info)
		count++
		if count%100 == 0 {
			fmt.Printf("\rProcessed: %d files", count)
		}
	}
	fmt.Printf("\rProcessed: %d files\n", count)

	// Find duplicates
	var totalWasted int64
	dupCount := 0
	for _, files := range fileMap {
		if len(files) > 1 {
			dupCount++
			fmt.Printf("\nDuplicate set (%d files, %s each):\n", len(files), formatSize(files[0].Size))
			for i, f := range files {
				marker := "  "
				if i > 0 {
					marker = "✂ "
					totalWasted += f.Size
				}
				fmt.Printf("%s%s\n", marker, f.Path)
			}
		}
	}

	elapsed := time.Since(start)
	fmt.Printf("\n=== Summary ===\n")
	fmt.Printf("Total files scanned: %d\n", count)
	fmt.Printf("Duplicate sets found: %d\n", dupCount)
	fmt.Printf("Wasted space: %s\n", formatSize(totalWasted))
	fmt.Printf("Time: %v\n", elapsed)

	if *deleteFlag && !*dryRun && totalWasted > 0 {
		fmt.Println("\nDeleting duplicates...")
		deleted := 0
		for _, files := range fileMap {
			if len(files) > 1 {
				for i := 1; i < len(files); i++ {
					if err := os.Remove(files[i].Path); err != nil {
						fmt.Fprintf(os.Stderr, "Failed to delete %s: %v\n", files[i].Path, err)
					} else {
						fmt.Printf("Deleted: %s\n", files[i].Path)
						deleted++
					}
				}
			}
		}
		fmt.Printf("Deleted %d files\n", deleted)
	} else if *deleteFlag && *dryRun {
		fmt.Println("\n[DRY RUN] Use -dry-run=false to actually delete")
	}
}